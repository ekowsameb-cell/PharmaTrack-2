import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Lazy GoogleGenAI client
  let geminiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI | null {
    if (!geminiClient && process.env.GEMINI_API_KEY) {
      geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return geminiClient;
  }

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString() 
    });
  });

  // Preset ambient pharmacy tracks
  const PRESET_TRACKS = [
    {
      id: 'preset-lofi-1',
      title: 'Lofi Dispensing Chill',
      genre: 'Lofi Hip Hop',
      bpm: 78,
      mood: 'Calm & Concentrated',
      durationSeconds: 30,
      description: 'Soft vinyl crackle, warm electric piano chords and gentle kick-snare for focused prescription dispensing.',
      model: 'lyria-3-clip-preview',
      prompt: 'Peaceful lofi hip hop beat with warm rhodes electric piano, soft vinyl crackle, mellow bassline, ambient coffeehouse breeze, relaxing pharmacy study background'
    },
    {
      id: 'preset-clinical-2',
      title: 'Superintendent Deep Focus',
      genre: 'Ambient Neo-Classical',
      bpm: 65,
      mood: 'Deep Clinical Clarity',
      durationSeconds: 30,
      description: 'Airy acoustic piano notes with smooth string pads, designed for drug interaction audits and DDR review.',
      model: 'lyria-3-clip-preview',
      prompt: 'Minimalist ambient piano with warm analog synthesizer pads, gentle harmonic reverb, deep calm scientific focus, soothing clinical workspace'
    },
    {
      id: 'preset-momo-3',
      title: 'Cashier Counter Rhythm',
      genre: 'Afrobeats / Highlife Chill',
      bpm: 96,
      mood: 'Uplifting & Smooth',
      durationSeconds: 30,
      description: 'Gentle Ghanaian acoustic guitar riffs with subtle shaker percussion to keep the queue moving with a smile.',
      model: 'lyria-3-clip-preview',
      prompt: 'Smooth Ghanaian Highlife and Chill Afrobeats guitar groove, soft wooden percussion, bright kalimba melody, warm sunshine afternoon in Accra'
    },
    {
      id: 'preset-night-4',
      title: 'Night Shift Synthwave Breeze',
      genre: 'Chillwave / Ambient Synth',
      bpm: 82,
      mood: 'Serene & Hypnotic',
      durationSeconds: 30,
      description: 'Floating cosmic pads and subtle arpeggios for quiet 24-hour pharmacy shifts.',
      model: 'lyria-3-pro-preview',
      prompt: 'Ethereal ambient synthwave with lush tape-delayed synthesizers, soft sub-bass, peaceful nocturnal breeze, zero fatigue work soundtrack'
    },
    {
      id: 'preset-zen-5',
      title: 'Binaural Inventory Flow',
      genre: 'Binaural Alpha Waves',
      bpm: 60,
      mood: 'Stress-Relief Flow State',
      durationSeconds: 30,
      description: 'Calming alpha-frequency drone and warm nature rain sounds for stocktaking and reconciliation.',
      model: 'lyria-3-clip-preview',
      prompt: 'Calming ambient soundscape with 432Hz harmonic singing bowl tones, soft warm rain, gentle acoustic harp plucks, pure restorative peace'
    }
  ];

  app.get('/api/music/presets', (req, res) => {
    res.json({ tracks: PRESET_TRACKS });
  });

  // Music generation endpoint using Lyria models
  app.post('/api/music/generate', async (req, res) => {
    try {
      const { 
        prompt, 
        genre = 'Lofi Focus', 
        durationSeconds = 30, 
        tempo = 'medium',
        modelType = 'clip' 
      } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const selectedModel = modelType === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';
      const ai = getGeminiClient();

      let audioData: string | null = null;
      let generationDetails = {
        title: `${genre} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
        model: selectedModel,
        prompt,
        durationSeconds: Math.min(Math.max(Number(durationSeconds) || 30, 10), 60),
        generatedAt: new Date().toISOString()
      };

      if (ai) {
        try {
          // Attempt Lyria generation with modern Google Gen AI SDK
          // Lyria music models support text-to-music generation
          const response = await ai.models.generateContent({
            model: selectedModel,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `Generate background work focus music: ${prompt}. Genre: ${genre}, Tempo: ${tempo}, Duration: ${durationSeconds}s. High quality, loopable, no harsh noise.`
                  }
                ]
              }
            ]
          });

          // Check if candidate parts contain inline audio data
          const candidates = response?.candidates || [];
          if (candidates.length > 0 && candidates[0].content?.parts) {
            for (const part of candidates[0].content.parts) {
              if (part.inlineData && part.inlineData.data) {
                audioData = part.inlineData.data;
                break;
              }
            }
          }
        } catch (genError: any) {
          console.warn(`[Lyria ${selectedModel}] Generation warning:`, genError?.message || genError);
          // Graceful fallback to rich procedural WebAudio synthesis format
        }
      }

      res.json({
        success: true,
        track: {
          id: `gen-${Date.now()}`,
          ...generationDetails,
          audioBase64: audioData,
          isSynthesized: !audioData
        }
      });
    } catch (error: any) {
      console.error('Error in /api/music/generate:', error);
      res.status(500).json({ 
        error: 'Failed to process music generation', 
        details: error?.message || String(error) 
      });
    }
  });

  // Setup Vite middleware in dev or serve static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pharmacy ERP & Lyria Music Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

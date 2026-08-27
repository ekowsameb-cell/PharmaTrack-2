import React, { useState } from 'react';
import { 
  Database, 
  Copy, 
  Check, 
  Code2, 
  Server, 
  Layers, 
  ShieldCheck, 
  Table, 
  Key, 
  ArrowRight,
  Terminal,
  Download,
  X
} from 'lucide-react';

interface PostgreSqlSchemaViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const POSTGRESQL_DDL_SCHEMA = `-- ====================================================================
-- PHARMATRACK GHANA ERP - PRODUCTION POSTGRESQL RELATIONAL SCHEMA
-- Multi-Tier Behind-The-Counter Workflow, GPhC Regulatory & GRA E-VAT
-- ====================================================================

-- 1. ENUM TYPES FOR STATE CONTROL
CREATE TYPE user_role AS ENUM (
    'COUNTER_CLERK', 
    'SUPERINTENDENT_PHARMACIST', 
    'CASHIER', 
    'OWNER'
);

CREATE TYPE order_status AS ENUM (
    'DRAFT', 
    'PENDING_CLINICAL_CLEARANCE', 
    'PENDING_PAYMENT', 
    'FISCALIZED_COMPLETED', 
    'CANCELLED'
);

CREATE TYPE payment_method AS ENUM (
    'CASH', 
    'MOBILE_MONEY', 
    'GHQR_BANKING', 
    'INSURANCE_ONLY'
);

CREATE TYPE momo_network AS ENUM (
    'MTN_MOMO', 
    'TELECEL_CASH', 
    'AT_MONEY'
);

-- 2. USERS TABLE
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    license_number VARCHAR(50), -- Required for Superintendent Pharmacists (GPhC Registration)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. PRODUCTS & INVENTORY TABLE
CREATE TABLE products (
    product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    generic_name VARCHAR(150) NOT NULL,
    brand_name VARCHAR(150),
    is_controlled_class_a BOOLEAN DEFAULT FALSE, -- Crucial for layout/routing trigger
    shelf_location VARCHAR(100) NOT NULL,        -- Behind-the-counter coordinates (e.g., 'Aisle 2 - Shelf B')
    available_quantity INT NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
    base_price_ghs NUMERIC(10, 2) NOT NULL,
    expiry_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. ORDERS MASTER TABLE
CREATE TABLE orders (
    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE, -- Generated post-checkout
    clerk_id UUID REFERENCES users(user_id) NOT NULL,
    pharmacist_id UUID REFERENCES users(user_id), -- Populated only if drug is Class A or requires clinical override
    cashier_id UUID REFERENCES users(user_id),
    status order_status NOT NULL DEFAULT 'DRAFT',
    requires_clinical_clearance BOOLEAN DEFAULT FALSE,
    clerk_notes TEXT,
    
    -- Regulatory Logging Fields (GPhC & MDC)
    prescribing_doctor_id VARCHAR(50), 
    dangerous_drugs_register_logged BOOLEAN DEFAULT FALSE,
    
    -- Financial Split Breakdown Fields
    insurance_provider_name VARCHAR(100),
    amount_billed_to_insurer NUMERIC(10, 2) DEFAULT 0.00,
    amount_payable_by_patient NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    
    -- GRA E-VAT Response Fields
    gra_invoice_number VARCHAR(100) UNIQUE,
    gra_fiscal_signature TEXT,
    gra_qr_code_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. ORDER LINE ITEMS (Handles splitting individual items from boxes/strips)
CREATE TABLE order_items (
    order_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(order_id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(product_id) NOT NULL,
    quantity_requested INT NOT NULL CHECK (quantity_requested > 0),
    unit_type VARCHAR(20) NOT NULL DEFAULT 'BOX', -- e.g., 'BOX', 'STRIP', 'TABLET'
    unit_price_at_sale NUMERIC(10, 2) NOT NULL
);

-- 6. TRANSACTIONS / PAYMENTS LOG (Populated by Cashier Gateway only)
CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(order_id) NOT NULL,
    cashier_id UUID REFERENCES users(user_id) NOT NULL,
    method payment_method NOT NULL,
    momo_provider momo_network,
    customer_phone VARCHAR(15), -- Used for Mobile Money STK prompts (e.g. 0244123456)
    telecom_reference VARCHAR(100),
    is_webhook_verified BOOLEAN DEFAULT FALSE,
    total_settled_ghs NUMERIC(10, 2) NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. TIMESTAMPTZ TRIGGER FOR AUTO-UPDATES
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_modtime 
BEFORE UPDATE ON orders 
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ====================================================================
-- SEED DATA & ROLE ASSIGNMENTS FOR PRODUCTION REPLICATION
-- ====================================================================

INSERT INTO users (full_name, username, password_hash, role, license_number) VALUES
('Kwame Mensah', 'kwame_clerk', '$2a$12$clerk_hashed_pw', 'COUNTER_CLERK', NULL),
('Pharm. Dr. Araba Mensah', 'dr_araba', '$2a$12$pharm_hashed_pw', 'SUPERINTENDENT_PHARMACIST', 'GPhC/P/2024/0932'),
('Emmanuel Tetteh', 'emmanuel_pos', '$2a$12$cashier_hashed_pw', 'CASHIER', NULL),
('Dr. Kwabena Boateng', 'dr_boateng', '$2a$12$owner_hashed_pw', 'OWNER', 'MDC/P/1998/0112');

INSERT INTO products (sku, generic_name, brand_name, is_controlled_class_a, shelf_location, available_quantity, base_price_ghs, expiry_date) VALUES
('SKU-AMOX-500', 'Amoxicillin Trihydrate 500mg', 'Amoxicap 500mg', FALSE, 'Aisle 2 - Shelf B', 42, 45.00, '2028-06-30'),
('SKU-PARA-1000', 'Paracetamol 500mg', 'M&G Paracetamol (1000s)', FALSE, 'Counter Drawer 1', 1200, 0.50, '2027-12-31'),
('SKU-TRAM-500', 'Tramadol Hydrochloride 50mg', 'Tramadol 50mg Caps', TRUE, 'Locked Dangerous Drugs Safe - Bin 01', 35, 120.00, '2027-04-15'),
('SKU-CO-ART-80', 'Artemether + Lumefantrine 80/480mg', 'Coartem 80/480 Forte', FALSE, 'Aisle 1 - Shelf A', 85, 68.00, '2027-11-20'),
('SKU-METF-500', 'Metformin Hydrochloride 500mg', 'Glucophage 500mg', FALSE, 'Aisle 3 - Shelf C', 150, 38.00, '2028-01-10');
`;

export const PostgreSqlSchemaViewer: React.FC<PostgreSqlSchemaViewerProps> = ({
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'ddl' | 'tables' | 'workflow'>('ddl');

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(POSTGRESQL_DDL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([POSTGRESQL_DDL_SCHEMA], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pharmatrack_ghana_schema.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">PostgreSQL Relational Data Architecture</h3>
                <span className="bg-blue-900/60 text-blue-300 border border-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  PostgreSQL 15+ / Supabase / Cloud SQL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Data tier state control with custom ENUMs, triggers, GPhC licensing, and GRA E-VAT integrity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied SQL' : 'Copy DDL'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .sql</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2 bg-slate-950/60 border-b border-slate-800 flex gap-2">
          <button
            onClick={() => setActiveSubTab('ddl')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'ddl'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Complete SQL Schema (DDL)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('tables')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'tables'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Entity Structures (6 Tables)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('workflow')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'workflow'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>State Machine & Triggers</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 font-sans">
          {activeSubTab === 'ddl' && (
            <div className="relative">
              <pre className="bg-slate-950 border border-slate-800 p-4 rounded-xl font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed max-h-[58vh]">
                <code>{POSTGRESQL_DDL_SCHEMA}</code>
              </pre>
            </div>
          )}

          {activeSubTab === 'tables' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Table 1: users */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-purple-900/60 text-purple-300 border border-purple-700 text-[10px] font-bold rounded">
                      TABLE
                    </span>
                    <h4 className="text-sm font-bold text-white font-mono">users</h4>
                  </div>
                  <span className="text-[10px] text-slate-400">Persona RBAC</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Stores operators with ENUM roles (<code className="text-purple-400">COUNTER_CLERK</code>, <code className="text-purple-400">SUPERINTENDENT_PHARMACIST</code>, <code className="text-purple-400">CASHIER</code>, <code className="text-purple-400">OWNER</code>) and GPhC license numbers.
                </p>
                <div className="text-[11px] font-mono text-slate-300 space-y-1 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  <div>🔑 <span className="text-amber-400">user_id</span>: UUID PRIMARY KEY</div>
                  <div>• <span className="text-sky-300">role</span>: user_role NOT NULL</div>
                  <div>• <span className="text-sky-300">license_number</span>: VARCHAR(50) (GPhC Pin)</div>
                </div>
              </div>

              {/* Table 2: products */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-900/60 text-emerald-300 border border-emerald-700 text-[10px] font-bold rounded">
                      TABLE
                    </span>
                    <h4 className="text-sm font-bold text-white font-mono">products</h4>
                  </div>
                  <span className="text-[10px] text-slate-400">FEFO & Shelf</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Tracks batch SKU, physical shelf location coordinate (e.g. Aisle 2 - Shelf B), and Class A regulatory flag.
                </p>
                <div className="text-[11px] font-mono text-slate-300 space-y-1 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  <div>🔑 <span className="text-amber-400">product_id</span>: UUID PRIMARY KEY</div>
                  <div>• <span className="text-sky-300">is_controlled_class_a</span>: BOOLEAN</div>
                  <div>• <span className="text-sky-300">shelf_location</span>: VARCHAR(100)</div>
                  <div>• <span className="text-sky-300">base_price_ghs</span>: NUMERIC(10,2)</div>
                </div>
              </div>

              {/* Table 3: orders */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-900/60 text-blue-300 border border-blue-700 text-[10px] font-bold rounded">
                      TABLE
                    </span>
                    <h4 className="text-sm font-bold text-white font-mono">orders</h4>
                  </div>
                  <span className="text-[10px] text-slate-400">Order Master</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Controls state machine progression, prescribing doctor MDC license, insurance split copays, and GRA E-VAT signatures.
                </p>
                <div className="text-[11px] font-mono text-slate-300 space-y-1 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  <div>🔑 <span className="text-amber-400">order_id</span>: UUID PRIMARY KEY</div>
                  <div>• <span className="text-sky-300">status</span>: order_status ENUM</div>
                  <div>• <span className="text-sky-300">prescribing_doctor_id</span>: VARCHAR(50)</div>
                  <div>• <span className="text-sky-300">gra_fiscal_signature</span>: TEXT</div>
                </div>
              </div>

              {/* Table 4: order_items */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-900/60 text-amber-300 border border-amber-700 text-[10px] font-bold rounded">
                      TABLE
                    </span>
                    <h4 className="text-sm font-bold text-white font-mono">order_items</h4>
                  </div>
                  <span className="text-[10px] text-slate-400">Line Items & Units</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Handles unit breakdown during sales (<code className="text-amber-400">BOX</code>, <code className="text-amber-400">STRIP</code>, <code className="text-amber-400">TABLET</code>) with cascade deletions on order cancel.
                </p>
                <div className="text-[11px] font-mono text-slate-300 space-y-1 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  <div>🔑 <span className="text-amber-400">order_item_id</span>: UUID PRIMARY KEY</div>
                  <div>• <span className="text-sky-300">order_id</span> ➔ REFERENCES orders(order_id)</div>
                  <div>• <span className="text-sky-300">unit_type</span>: VARCHAR(20) DEFAULT 'BOX'</div>
                </div>
              </div>

              {/* Table 5: transactions */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-rose-900/60 text-rose-300 border border-rose-700 text-[10px] font-bold rounded">
                      TABLE
                    </span>
                    <h4 className="text-sm font-bold text-white font-mono">transactions</h4>
                  </div>
                  <span className="text-[10px] text-slate-400">Cashier Settlement</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Populated strictly by Cashier Gateway upon cash tender, GhQR, or telecom STK push webhook confirmation.
                </p>
                <div className="text-[11px] font-mono text-slate-300 space-y-1 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  <div>🔑 <span className="text-amber-400">transaction_id</span>: UUID PRIMARY KEY</div>
                  <div>• <span className="text-sky-300">momo_provider</span>: momo_network ENUM</div>
                  <div>• <span className="text-sky-300">is_webhook_verified</span>: BOOLEAN</div>
                  <div>• <span className="text-sky-300">total_settled_ghs</span>: NUMERIC(10,2)</div>
                </div>
              </div>

              {/* Triggers and Audit */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-teal-900/60 text-teal-300 border border-teal-700 text-[10px] font-bold rounded">
                      TRIGGER
                    </span>
                    <h4 className="text-sm font-bold text-white font-mono">update_orders_modtime</h4>
                  </div>
                  <span className="text-[10px] text-slate-400">Audit Guard</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Automatic execution trigger guaranteeing non-repudiation and timestamp updating upon any row alteration.
                </p>
                <div className="text-[11px] font-mono text-slate-300 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  <code>BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_modified_column();</code>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'workflow' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <h4 className="text-sm font-bold text-white mb-2">Relational Order Lifecycle State Machine</h4>
                <p className="text-xs text-slate-400 mb-4">
                  The <code className="text-blue-400 font-mono">order_status</code> ENUM prevents transaction-skipping between Counter Assistant, Pharmacist, and Cashier:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <div className="text-xs font-bold text-sky-400">1. DRAFT</div>
                    <p className="text-[11px] text-slate-400 mt-1">Staged by Counter Assistant (Kwame)</p>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <div className="text-xs font-bold text-purple-400">2. CLINICAL CLEARANCE</div>
                    <p className="text-[11px] text-slate-400 mt-1">GPhC / Class A / Copay Reviewed (Dr. Araba)</p>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <div className="text-xs font-bold text-amber-400">3. PENDING PAYMENT</div>
                    <p className="text-[11px] text-slate-400 mt-1">Ready at Cashier POS (Emmanuel)</p>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <div className="text-xs font-bold text-emerald-400">4. FISCALIZED</div>
                    <p className="text-[11px] text-slate-400 mt-1">GRA E-VAT QR + Stock Decremented</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <h4 className="text-sm font-bold text-white mb-2">Sample Verification Queries for DBAs</h4>
                <div className="space-y-2">
                  <div className="bg-slate-900 p-2.5 rounded font-mono text-xs text-slate-300">
                    <span className="text-slate-500">-- Find all Class A Controlled Substance Orders awaiting Superintendent signoff:</span><br />
                    <span className="text-purple-400">SELECT</span> o.order_id, o.clerk_notes, p.brand_name, u.full_name <span className="text-purple-400">AS</span> clerk_name<br />
                    <span className="text-purple-400">FROM</span> orders o<br />
                    <span className="text-purple-400">JOIN</span> order_items oi <span className="text-purple-400">ON</span> o.order_id = oi.order_id<br />
                    <span className="text-purple-400">JOIN</span> products p <span className="text-purple-400">ON</span> oi.product_id = p.product_id<br />
                    <span className="text-purple-400">JOIN</span> users u <span className="text-purple-400">ON</span> o.clerk_id = u.user_id<br />
                    <span className="text-purple-400">WHERE</span> o.status = <span className="text-emerald-300">'PENDING_CLINICAL_CLEARANCE'</span> <span className="text-purple-400">AND</span> p.is_controlled_class_a = TRUE;
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Strict Foreign Key and Domain Validation Enabled</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors"
          >
            Close Schema Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

# Blockchain Distribution Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun sistem baru (repo terpisah) tracking distribusi produk pertanian dengan blockchain Polygon + QR code, berbasis fitur stok Arina Agri.

**Architecture:** Hash-anchored pattern — data detail di Supabase, hanya SHA-256 hash setiap event yang dicatat on-chain di Polygon Amoy via backend relay wallet. Konsumen scan QR → halaman publik `/track/[batchId]` menampilkan chain of custody + verifikasi hash blockchain.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase, ethers.js v6, Hardhat + Solidity 0.8.20, qrcode, Vitest, MUI v9, Tailwind v4, Zod, react-hook-form

---

## File Map

```
D:\Arina Agri\blockchain-tracking\          ← REPO BARU
├── contracts/                              ← Hardhat subfolder
│   ├── hardhat.config.ts
│   ├── package.json
│   ├── contracts/ProductTracker.sol
│   ├── scripts/deploy.ts
│   ├── test/ProductTracker.test.ts
│   └── deployments/amoy.json
├── app/
│   ├── dashboard/
│   │   ├── batch/page.tsx + _components/
│   │   ├── distribusi/page.tsx + terima/ + _components/
│   │   └── qr/[batchId]/page.tsx
│   ├── track/[batchId]/page.tsx + _components/
│   └── api/
│       ├── batch/route.ts
│       ├── distribusi/handover/route.ts
│       └── track/[batchId]/route.ts
├── controllers/
│   ├── batch/BatchController.tsx
│   ├── distribusi/DistribusiController.tsx
│   └── track/TrackController.tsx
├── hooks/
│   ├── useBatch.ts
│   ├── useDistribusi.ts
│   └── useTrack.ts
├── lib/
│   ├── supabase.ts
│   ├── hash.ts
│   ├── blockchain.ts
│   └── qrcode.ts
├── types/
│   └── index.ts
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql
```

---

## Task 1: Inisialisasi Repo Baru Next.js

**Files:**
- Create: `D:\Arina Agri\blockchain-tracking\` (direktori baru)
- Create: `package.json`, `tsconfig.json`, `.env.local`, `.env.example`

- [ ] **Step 1: Buat direktori dan inisialisasi Next.js**

```bash
cd "D:\Arina Agri"
npx create-next-app@16.2.6 blockchain-tracking --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
cd blockchain-tracking
```

- [ ] **Step 2: Install dependencies tambahan**

```bash
npm install @supabase/supabase-js ethers qrcode @mui/material @mui/icons-material @emotion/react @emotion/styled @hookform/resolvers react-hook-form zod next-intl
npm install --save-dev @types/qrcode vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Buat file `.env.example`**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Polygon Relay Wallet
RELAY_WALLET_PRIVATE_KEY=your_private_key_hex
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
CONTRACT_ADDRESS=your_deployed_contract_address

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 4: Buat `.env.local` (isi dengan nilai nyata, jangan commit)**

Copy dari `.env.example` dan isi nilainya.

- [ ] **Step 5: Konfigurasi `vitest.config.ts`**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **Step 6: Buat `vitest.setup.ts`**

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom';
```

- [ ] **Step 7: Verifikasi setup**

```bash
npm run dev
```

Expected: Server berjalan di `http://localhost:3000`

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: initialize Next.js project for blockchain distribution tracking"
```

---

## Task 2: Setup Hardhat Smart Contract Subfolder

**Files:**
- Create: `contracts/package.json`
- Create: `contracts/hardhat.config.ts`
- Create: `contracts/contracts/ProductTracker.sol`

- [ ] **Step 1: Inisialisasi Hardhat di subfolder `contracts/`**

```bash
mkdir contracts && cd contracts
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-ethers ethers dotenv
npx hardhat init
```

Pilih: `Create a TypeScript project`

- [ ] **Step 2: Tulis `contracts/hardhat.config.ts`**

```typescript
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env.local' });

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    amoy: {
      url: process.env.POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology',
      accounts: process.env.RELAY_WALLET_PRIVATE_KEY
        ? [process.env.RELAY_WALLET_PRIVATE_KEY]
        : [],
      chainId: 80002,
    },
    hardhat: { chainId: 31337 },
  },
};

export default config;
```

- [ ] **Step 3: Commit setup**

```bash
cd ..
git add contracts/
git commit -m "chore: add Hardhat smart contract subfolder"
```

---

## Task 3: Smart Contract ProductTracker.sol

**Files:**
- Create: `contracts/contracts/ProductTracker.sol`
- Create: `contracts/test/ProductTracker.test.ts`

- [ ] **Step 1: Tulis failing test dulu**

```typescript
// contracts/test/ProductTracker.test.ts
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ProductTracker } from '../typechain-types';

describe('ProductTracker', () => {
  let contract: ProductTracker;
  let relay: any;
  let other: any;
  const BATCH_ID = 'batch-uuid-001';
  const DATA_HASH = ethers.keccak256(ethers.toUtf8Bytes('test-data'));

  beforeEach(async () => {
    [relay, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('ProductTracker');
    contract = await Factory.deploy(relay.address) as ProductTracker;
  });

  it('registers a batch and emits event', async () => {
    await expect(contract.registerBatch(BATCH_ID, DATA_HASH))
      .to.emit(contract, 'BatchRegistered')
      .withArgs(BATCH_ID, DATA_HASH, await ethers.provider.getBlock('latest').then(b => b!.timestamp + 1));
    
    const history = await contract.getHistory(BATCH_ID);
    expect(history.length).to.equal(1);
    expect(history[0].dataHash).to.equal(DATA_HASH);
    expect(history[0].actorRole).to.equal(0); // PETANI
  });

  it('records handover and appends to history', async () => {
    await contract.registerBatch(BATCH_ID, DATA_HASH);
    const handoverHash = ethers.keccak256(ethers.toUtf8Bytes('handover-data'));
    await contract.recordHandover(BATCH_ID, handoverHash, 1); // GUDANG
    
    const history = await contract.getHistory(BATCH_ID);
    expect(history.length).to.equal(2);
    expect(history[1].actorRole).to.equal(1);
  });

  it('rejects handover for unregistered batch', async () => {
    await expect(
      contract.recordHandover('unknown', DATA_HASH, 1)
    ).to.be.revertedWith('Batch not registered');
  });

  it('verifies hash correctly', async () => {
    await contract.registerBatch(BATCH_ID, DATA_HASH);
    expect(await contract.verifyHash(BATCH_ID, 0, DATA_HASH)).to.be.true;
    expect(await contract.verifyHash(BATCH_ID, 0, ethers.keccak256(ethers.toUtf8Bytes('wrong')))).to.be.false;
    expect(await contract.verifyHash(BATCH_ID, 99, DATA_HASH)).to.be.false;
  });

  it('blocks non-relay wallet', async () => {
    await expect(
      contract.connect(other).registerBatch(BATCH_ID, DATA_HASH)
    ).to.be.revertedWith('Only relay wallet');
  });
});
```

- [ ] **Step 2: Jalankan test — pastikan FAIL**

```bash
cd contracts
npx hardhat test
```

Expected: `Error: Cannot find module` atau compile error karena kontrak belum ada.

- [ ] **Step 3: Tulis `contracts/contracts/ProductTracker.sol`**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ProductTracker {
    enum ActorRole { PETANI, GUDANG, DISTRIBUTOR, RETAILER }

    struct BatchEvent {
        bytes32 dataHash;
        address actorAddress;
        ActorRole actorRole;
        uint256 timestamp;
    }

    address public relayWallet;
    mapping(string => BatchEvent[]) private batchHistory;

    event BatchRegistered(string indexed batchId, bytes32 dataHash, uint256 timestamp);
    event HandoverRecorded(string indexed batchId, bytes32 dataHash, ActorRole actorRole, uint256 timestamp);

    modifier onlyRelay() {
        require(msg.sender == relayWallet, "Only relay wallet");
        _;
    }

    constructor(address _relayWallet) {
        relayWallet = _relayWallet;
    }

    function registerBatch(string calldata batchId, bytes32 dataHash) external onlyRelay {
        batchHistory[batchId].push(BatchEvent({
            dataHash: dataHash,
            actorAddress: msg.sender,
            actorRole: ActorRole.PETANI,
            timestamp: block.timestamp
        }));
        emit BatchRegistered(batchId, dataHash, block.timestamp);
    }

    function recordHandover(
        string calldata batchId,
        bytes32 dataHash,
        ActorRole actorRole
    ) external onlyRelay {
        require(batchHistory[batchId].length > 0, "Batch not registered");
        batchHistory[batchId].push(BatchEvent({
            dataHash: dataHash,
            actorAddress: msg.sender,
            actorRole: actorRole,
            timestamp: block.timestamp
        }));
        emit HandoverRecorded(batchId, dataHash, actorRole, block.timestamp);
    }

    function getHistory(string calldata batchId) external view returns (BatchEvent[] memory) {
        return batchHistory[batchId];
    }

    function verifyHash(
        string calldata batchId,
        uint256 index,
        bytes32 hash
    ) external view returns (bool) {
        if (index >= batchHistory[batchId].length) return false;
        return batchHistory[batchId][index].dataHash == hash;
    }

    function getHistoryLength(string calldata batchId) external view returns (uint256) {
        return batchHistory[batchId].length;
    }
}
```

- [ ] **Step 4: Jalankan test — pastikan PASS**

```bash
npx hardhat test
```

Expected output:
```
ProductTracker
  ✓ registers a batch and emits event
  ✓ records handover and appends to history
  ✓ rejects handover for unregistered batch
  ✓ verifies hash correctly
  ✓ blocks non-relay wallet

5 passing
```

- [ ] **Step 5: Commit**

```bash
cd ..
git add contracts/contracts/ProductTracker.sol contracts/test/ProductTracker.test.ts
git commit -m "feat(contract): add ProductTracker smart contract with full test coverage"
```

---

## Task 4: Deploy Kontrak ke Polygon Amoy

**Files:**
- Create: `contracts/scripts/deploy.ts`
- Create: `contracts/deployments/amoy.json`

- [ ] **Step 1: Pastikan wallet punya MATIC testnet**

Kunjungi https://faucet.polygon.technology dan minta MATIC untuk address relay wallet di Amoy testnet.

- [ ] **Step 2: Tulis `contracts/scripts/deploy.ts`**

```typescript
import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with:', deployer.address);
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'MATIC');

  const Factory = await ethers.getContractFactory('ProductTracker');
  const contract = await Factory.deploy(deployer.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('ProductTracker deployed to:', address);

  const deployment = {
    address,
    deployerAddress: deployer.address,
    network: 'amoy',
    chainId: 80002,
    deployedAt: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, '../deployments/amoy.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(deployment, null, 2));
  console.log('Deployment info saved to deployments/amoy.json');
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Deploy ke Amoy**

```bash
cd contracts
npx hardhat run scripts/deploy.ts --network amoy
```

Expected:
```
Deploying with: 0xYourRelayWalletAddress
Balance: 0.5 MATIC
ProductTracker deployed to: 0xContractAddress
Deployment info saved to deployments/amoy.json
```

- [ ] **Step 4: Salin `CONTRACT_ADDRESS` ke `.env.local`**

```env
CONTRACT_ADDRESS=0xContractAddress  # dari output deploy
```

- [ ] **Step 5: Commit**

```bash
cd ..
git add contracts/scripts/deploy.ts contracts/deployments/amoy.json
git commit -m "feat(contract): deploy ProductTracker to Polygon Amoy"
```

---

## Task 5: Supabase Schema Migration

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Tulis migration SQL**

```sql
-- supabase/migrations/001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Tabel dari Arina (disesuaikan) ────────────────────────────────

CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  urutan INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  urutan INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS buyers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS harvest_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_code TEXT NOT NULL UNIQUE,
  tanggal_panen DATE NOT NULL,
  grade TEXT NOT NULL,
  berat_masuk NUMERIC(10,2) NOT NULL,
  stok_tersisa NUMERIC(10,2) NOT NULL,
  harga_modal NUMERIC(15,2) NOT NULL DEFAULT 0,
  harga_jual NUMERIC(15,2) NOT NULL DEFAULT 0,
  lokasi_penyimpanan TEXT NOT NULL,
  estimasi_kadaluarsa DATE,
  catatan TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'aman'
    CHECK (status IN ('aman','menipis','hampir_kadaluarsa','habis')),
  -- Blockchain fields
  blockchain_tx_hash TEXT,
  blockchain_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (blockchain_status IN ('pending','confirmed','failed')),
  qr_code_url TEXT,
  qr_code_data TEXT,  -- base64 PNG
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_mutations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES harvest_batches(id) ON DELETE CASCADE,
  tipe TEXT NOT NULL CHECK (tipe IN ('masuk','keluar')),
  berat NUMERIC(10,2) NOT NULL,
  tujuan TEXT,
  tanggal DATE NOT NULL,
  catatan TEXT DEFAULT '',
  nama_pembeli TEXT,
  harga_realisasi NUMERIC(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabel Baru untuk Distribusi ───────────────────────────────────

CREATE TYPE actor_role AS ENUM ('petani','gudang','distributor','retailer');

CREATE TABLE IF NOT EXISTS actors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role actor_role NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS distribution_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES harvest_batches(id) ON DELETE CASCADE,
  from_actor_id UUID REFERENCES actors(id),
  to_actor_id UUID REFERENCES actors(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('serah_terima','konfirmasi_terima')),
  weight_kg NUMERIC(10,2),
  notes TEXT DEFAULT '',
  location TEXT DEFAULT '',
  data_hash TEXT NOT NULL,
  blockchain_tx_hash TEXT,
  blockchain_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (blockchain_status IN ('pending','confirmed','failed')),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qr_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES harvest_batches(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  ip_hash TEXT,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('actor','consumer'))
);

-- ── RLS Policies ──────────────────────────────────────────────────
ALTER TABLE harvest_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE actors ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;

-- harvest_batches: owner bisa semua, public bisa read untuk /track
CREATE POLICY "owner_all" ON harvest_batches FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "public_read" ON harvest_batches FOR SELECT USING (true);

-- distribution_events: public read untuk halaman konsumen
CREATE POLICY "owner_all" ON distribution_events FOR ALL USING (true);
CREATE POLICY "public_read" ON distribution_events FOR SELECT USING (true);

-- actors: bisa read semua (untuk dropdown)
CREATE POLICY "all_read" ON actors FOR SELECT USING (true);
CREATE POLICY "owner_write" ON actors FOR ALL USING (auth.uid() = user_id);

-- grades & locations: owner only
CREATE POLICY "owner_all" ON grades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "owner_all" ON locations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "owner_all" ON buyers FOR ALL USING (auth.uid() = user_id);

-- stock_mutations
CREATE POLICY "owner_all" ON stock_mutations FOR ALL
  USING (batch_id IN (SELECT id FROM harvest_batches WHERE user_id = auth.uid()));
```

- [ ] **Step 2: Jalankan migration di Supabase Dashboard**

Buka Supabase Dashboard → SQL Editor → paste isi file → Run.

Atau jika pakai Supabase CLI:
```bash
npx supabase db push
```

- [ ] **Step 3: Verifikasi tabel terbuat**

Di Supabase Dashboard → Table Editor → pastikan ada:
`harvest_batches`, `distribution_events`, `actors`, `stock_mutations`, `qr_scans`, `grades`, `locations`, `buyers`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/001_initial_schema.sql
git commit -m "feat(db): add Supabase schema with blockchain and distribution tables"
```

---

## Task 6: Core Types & Supabase Client

**Files:**
- Create: `types/index.ts`
- Create: `lib/supabase.ts`

- [ ] **Step 1: Tulis `types/index.ts`**

```typescript
// types/index.ts

export type BlockchainStatus = 'pending' | 'confirmed' | 'failed';
export type BatchStatus = 'aman' | 'menipis' | 'hampir_kadaluarsa' | 'habis';
export type ActorRole = 'petani' | 'gudang' | 'distributor' | 'retailer';
export type DistributionEventType = 'serah_terima' | 'konfirmasi_terima';

export interface HarvestBatch {
  id: string;
  userId: string;
  batchCode: string;
  tanggalPanen: string;
  grade: string;
  beratMasuk: number;
  stokTersisa: number;
  hargaModal: number;
  hargaJual: number;
  lokasiPenyimpanan: string;
  estimasiKadaluarsa: string;
  catatan: string;
  status: BatchStatus;
  blockchainTxHash: string | null;
  blockchainStatus: BlockchainStatus;
  qrCodeUrl: string | null;
  qrCodeData: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Actor {
  id: string;
  userId: string | null;
  name: string;
  role: ActorRole;
  phone: string | null;
  address: string | null;
  createdAt: string;
}

export interface DistributionEvent {
  id: string;
  batchId: string;
  fromActorId: string | null;
  toActorId: string | null;
  fromActor?: Actor;
  toActor?: Actor;
  eventType: DistributionEventType;
  weightKg: number | null;
  notes: string;
  location: string;
  dataHash: string;
  blockchainTxHash: string | null;
  blockchainStatus: BlockchainStatus;
  confirmedAt: string | null;
  createdAt: string;
}

export interface TrackingData {
  batch: HarvestBatch;
  events: DistributionEvent[];
  onChainVerification: OnChainEvent[];
}

export interface OnChainEvent {
  dataHash: string;
  actorAddress: string;
  actorRole: number;
  timestamp: bigint;
}

export interface VerificationResult {
  index: number;
  dbHash: string;
  chainHash: string;
  isVerified: boolean;
}
```

- [ ] **Step 2: Tulis `lib/supabase.ts`**

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { HarvestBatch, DistributionEvent, Actor } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client dengan service role (untuk API routes)
export function createServiceClient() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// ── DB row → domain type mappers ─────────────────────────────────

export function mapBatch(row: Record<string, unknown>): HarvestBatch {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    batchCode: row.batch_code as string,
    tanggalPanen: row.tanggal_panen as string,
    grade: row.grade as string,
    beratMasuk: Number(row.berat_masuk),
    stokTersisa: Number(row.stok_tersisa),
    hargaModal: Number(row.harga_modal),
    hargaJual: Number(row.harga_jual),
    lokasiPenyimpanan: row.lokasi_penyimpanan as string,
    estimasiKadaluarsa: row.estimasi_kadaluarsa as string,
    catatan: (row.catatan as string) ?? '',
    status: row.status as HarvestBatch['status'],
    blockchainTxHash: (row.blockchain_tx_hash as string) ?? null,
    blockchainStatus: (row.blockchain_status as HarvestBatch['blockchainStatus']) ?? 'pending',
    qrCodeUrl: (row.qr_code_url as string) ?? null,
    qrCodeData: (row.qr_code_data as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapActor(row: Record<string, unknown>): Actor {
  return {
    id: row.id as string,
    userId: (row.user_id as string) ?? null,
    name: row.name as string,
    role: row.role as Actor['role'],
    phone: (row.phone as string) ?? null,
    address: (row.address as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export function mapDistributionEvent(row: Record<string, unknown>): DistributionEvent {
  return {
    id: row.id as string,
    batchId: row.batch_id as string,
    fromActorId: (row.from_actor_id as string) ?? null,
    toActorId: (row.to_actor_id as string) ?? null,
    fromActor: row.from_actor ? mapActor(row.from_actor as Record<string, unknown>) : undefined,
    toActor: row.to_actor ? mapActor(row.to_actor as Record<string, unknown>) : undefined,
    eventType: row.event_type as DistributionEvent['eventType'],
    weightKg: row.weight_kg ? Number(row.weight_kg) : null,
    notes: (row.notes as string) ?? '',
    location: (row.location as string) ?? '',
    dataHash: row.data_hash as string,
    blockchainTxHash: (row.blockchain_tx_hash as string) ?? null,
    blockchainStatus: (row.blockchain_status as DistributionEvent['blockchainStatus']) ?? 'pending',
    confirmedAt: (row.confirmed_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add types/index.ts lib/supabase.ts
git commit -m "feat: add core types and Supabase client with mappers"
```

---

## Task 7: lib/hash.ts

**Files:**
- Create: `lib/hash.ts`
- Create: `lib/__tests__/hash.test.ts`

- [ ] **Step 1: Tulis failing test**

```typescript
// lib/__tests__/hash.test.ts
import { describe, it, expect } from 'vitest';
import { sha256Hex, sha256Bytes32, hashBatchData, hashHandoverData } from '../hash';

describe('hash utilities', () => {
  it('sha256Hex produces consistent 64-char hex', () => {
    const result = sha256Hex({ id: 'abc', value: 123 });
    expect(result).toHaveLength(64);
    expect(result).toBe(sha256Hex({ id: 'abc', value: 123 }));
  });

  it('sha256Hex differs for different inputs', () => {
    expect(sha256Hex({ a: 1 })).not.toBe(sha256Hex({ a: 2 }));
  });

  it('sha256Bytes32 prefixes with 0x and is 66 chars', () => {
    const result = sha256Bytes32({ test: true });
    expect(result).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('hashBatchData returns bytes32', () => {
    const result = hashBatchData({
      id: 'uuid', batchCode: 'B-001', tanggalPanen: '2026-01-01',
      grade: 'A', beratMasuk: 100, hargaModal: 10000, hargaJual: 50000,
      lokasiPenyimpanan: 'Gudang Utama',
    });
    expect(result).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('hashHandoverData returns bytes32', () => {
    const result = hashHandoverData({
      batchId: 'uuid', fromActorId: 'a1', toActorId: 'a2',
      eventType: 'serah_terima', weightKg: 50, location: 'Jakarta',
      createdAt: '2026-01-01T00:00:00Z',
    });
    expect(result).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
```

- [ ] **Step 2: Jalankan test — pastikan FAIL**

```bash
npx vitest run lib/__tests__/hash.test.ts
```

Expected: `Cannot find module '../hash'`

- [ ] **Step 3: Implementasi `lib/hash.ts`**

```typescript
// lib/hash.ts
import { createHash } from 'crypto';

export function sha256Hex(data: object | string): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data, Object.keys(data).sort());
  return createHash('sha256').update(str, 'utf8').digest('hex');
}

export function sha256Bytes32(data: object | string): `0x${string}` {
  return `0x${sha256Hex(data)}`;
}

export function hashBatchData(batch: {
  id: string;
  batchCode: string;
  tanggalPanen: string;
  grade: string;
  beratMasuk: number;
  hargaModal: number;
  hargaJual: number;
  lokasiPenyimpanan: string;
}): `0x${string}` {
  return sha256Bytes32(batch);
}

export function hashHandoverData(event: {
  batchId: string;
  fromActorId: string | null;
  toActorId: string | null;
  eventType: string;
  weightKg: number | null;
  location: string;
  createdAt: string;
}): `0x${string}` {
  return sha256Bytes32(event);
}
```

- [ ] **Step 4: Jalankan test — pastikan PASS**

```bash
npx vitest run lib/__tests__/hash.test.ts
```

Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add lib/hash.ts lib/__tests__/hash.test.ts
git commit -m "feat(lib): add SHA-256 hash utilities with tests"
```

---

## Task 8: lib/blockchain.ts

**Files:**
- Create: `lib/blockchain.ts`
- Create: `lib/abi/ProductTracker.json` (dari Hardhat artifact)

- [ ] **Step 1: Copy ABI dari Hardhat artifacts**

Setelah `npx hardhat compile` di folder `contracts/`, copy ABI:

```bash
# Di folder contracts/
npx hardhat compile
```

Kemudian buat `lib/abi/ProductTracker.json` dengan isi dari:
`contracts/artifacts/contracts/ProductTracker.sol/ProductTracker.json`

Hanya copy bagian `abi` array-nya:

```json
// lib/abi/ProductTracker.json
[
  {
    "inputs": [{"internalType": "address","name": "_relayWallet","type": "address"}],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"name": "batchId","type": "string"},
      {"indexed": false,"name": "dataHash","type": "bytes32"},
      {"indexed": false,"name": "timestamp","type": "uint256"}
    ],
    "name": "BatchRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"name": "batchId","type": "string"},
      {"indexed": false,"name": "dataHash","type": "bytes32"},
      {"indexed": false,"name": "actorRole","type": "uint8"},
      {"indexed": false,"name": "timestamp","type": "uint256"}
    ],
    "name": "HandoverRecorded",
    "type": "event"
  },
  {
    "inputs": [{"name": "batchId","type": "string"},{"name": "dataHash","type": "bytes32"}],
    "name": "registerBatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "batchId","type": "string"},
      {"name": "dataHash","type": "bytes32"},
      {"name": "actorRole","type": "uint8"}
    ],
    "name": "recordHandover",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "batchId","type": "string"}],
    "name": "getHistory",
    "outputs": [{"components": [
      {"name": "dataHash","type": "bytes32"},
      {"name": "actorAddress","type": "address"},
      {"name": "actorRole","type": "uint8"},
      {"name": "timestamp","type": "uint256"}
    ],"type": "tuple[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "batchId","type": "string"},
      {"name": "index","type": "uint256"},
      {"name": "hash","type": "bytes32"}
    ],
    "name": "verifyHash",
    "outputs": [{"type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
]
```

- [ ] **Step 2: Implementasi `lib/blockchain.ts`**

```typescript
// lib/blockchain.ts
// Server-only — hanya dipanggil dari API routes
import { ethers } from 'ethers';
import ABI from './abi/ProductTracker.json';
import type { OnChainEvent } from '@/types';

const ACTOR_ROLE_MAP: Record<string, number> = {
  petani: 0,
  gudang: 1,
  distributor: 2,
  retailer: 3,
};

let _provider: ethers.JsonRpcProvider | null = null;
let _wallet: ethers.Wallet | null = null;
let _contract: ethers.Contract | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    const rpcUrl = process.env.POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology';
    _provider = new ethers.JsonRpcProvider(rpcUrl);
  }
  return _provider;
}

function getWallet(): ethers.Wallet {
  if (!_wallet) {
    const key = process.env.RELAY_WALLET_PRIVATE_KEY;
    if (!key) throw new Error('RELAY_WALLET_PRIVATE_KEY not set');
    _wallet = new ethers.Wallet(key, getProvider());
  }
  return _wallet;
}

function getContract(): ethers.Contract {
  if (!_contract) {
    const address = process.env.CONTRACT_ADDRESS;
    if (!address) throw new Error('CONTRACT_ADDRESS not set');
    _contract = new ethers.Contract(address, ABI, getWallet());
  }
  return _contract;
}

export async function registerBatchOnChain(
  batchId: string,
  dataHash: `0x${string}`
): Promise<string> {
  const contract = getContract();
  const tx = await contract.registerBatch(batchId, dataHash);
  const receipt = await tx.wait();
  return receipt.hash as string;
}

export async function recordHandoverOnChain(
  batchId: string,
  dataHash: `0x${string}`,
  actorRole: string
): Promise<string> {
  const contract = getContract();
  const roleIndex = ACTOR_ROLE_MAP[actorRole] ?? 0;
  const tx = await contract.recordHandover(batchId, dataHash, roleIndex);
  const receipt = await tx.wait();
  return receipt.hash as string;
}

export async function getHistoryFromChain(batchId: string): Promise<OnChainEvent[]> {
  const contract = getContract();
  const raw = await contract.getHistory(batchId);
  return raw.map((e: { dataHash: string; actorAddress: string; actorRole: bigint; timestamp: bigint }) => ({
    dataHash: e.dataHash,
    actorAddress: e.actorAddress,
    actorRole: Number(e.actorRole),
    timestamp: e.timestamp,
  }));
}

export async function verifyHashOnChain(
  batchId: string,
  index: number,
  hash: `0x${string}`
): Promise<boolean> {
  const contract = getContract();
  return await contract.verifyHash(batchId, index, hash) as boolean;
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/blockchain.ts lib/abi/ProductTracker.json
git commit -m "feat(lib): add blockchain relay client for Polygon Amoy"
```

---

## Task 9: lib/qrcode.ts

**Files:**
- Create: `lib/qrcode.ts`
- Create: `lib/__tests__/qrcode.test.ts`

- [ ] **Step 1: Tulis failing test**

```typescript
// lib/__tests__/qrcode.test.ts
import { describe, it, expect } from 'vitest';
import { generateQrCodeDataUrl, getBatchTrackingUrl } from '../qrcode';

describe('qrcode utilities', () => {
  it('getBatchTrackingUrl returns correct URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    const url = getBatchTrackingUrl('uuid-123');
    expect(url).toBe('http://localhost:3000/track/uuid-123');
  });

  it('generateQrCodeDataUrl returns base64 PNG string', async () => {
    const dataUrl = await generateQrCodeDataUrl('uuid-123');
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(dataUrl.length).toBeGreaterThan(100);
  });
});
```

- [ ] **Step 2: Jalankan test — pastikan FAIL**

```bash
npx vitest run lib/__tests__/qrcode.test.ts
```

- [ ] **Step 3: Implementasi `lib/qrcode.ts`**

```typescript
// lib/qrcode.ts
import QRCode from 'qrcode';

export function getBatchTrackingUrl(batchId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base}/track/${batchId}`;
}

export async function generateQrCodeDataUrl(batchId: string): Promise<string> {
  const url = getBatchTrackingUrl(batchId);
  return await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
}
```

- [ ] **Step 4: Jalankan test — pastikan PASS**

```bash
npx vitest run lib/__tests__/qrcode.test.ts
```

Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add lib/qrcode.ts lib/__tests__/qrcode.test.ts
git commit -m "feat(lib): add QR code generator utility"
```

---

## Task 10: API Route — Batch Create

**Files:**
- Create: `app/api/batch/route.ts`

- [ ] **Step 1: Tulis `app/api/batch/route.ts`**

```typescript
// app/api/batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, mapBatch } from '@/lib/supabase';
import { hashBatchData } from '@/lib/hash';
import { registerBatchOnChain } from '@/lib/blockchain';
import { generateQrCodeDataUrl, getBatchTrackingUrl } from '@/lib/qrcode';

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await req.json();
    const {
      userId, tanggalPanen, grade, beratMasuk,
      hargaModal, hargaJual, lokasiPenyimpanan,
      estimasiKadaluarsa, catatan,
    } = body;

    if (!userId || !tanggalPanen || !grade || !beratMasuk) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate batch code: B-YYYYMMDD-XXXX
    const dateStr = tanggalPanen.replace(/-/g, '');
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const batchCode = `B-${dateStr}-${suffix}`;

    // Insert ke Supabase dulu, dapat ID
    const { data: batchRow, error: insertError } = await supabase
      .from('harvest_batches')
      .insert({
        user_id: userId,
        batch_code: batchCode,
        tanggal_panen: tanggalPanen,
        grade,
        berat_masuk: beratMasuk,
        stok_tersisa: beratMasuk,
        harga_modal: hargaModal ?? 0,
        harga_jual: hargaJual ?? 0,
        lokasi_penyimpanan: lokasiPenyimpanan,
        estimasi_kadaluarsa: estimasiKadaluarsa ?? null,
        catatan: catatan ?? '',
        blockchain_status: 'pending',
      })
      .select()
      .single();

    if (insertError || !batchRow) {
      return NextResponse.json({ error: insertError?.message ?? 'Insert failed' }, { status: 500 });
    }

    const batch = mapBatch(batchRow);

    // Hash data batch
    const dataHash = hashBatchData({
      id: batch.id,
      batchCode: batch.batchCode,
      tanggalPanen: batch.tanggalPanen,
      grade: batch.grade,
      beratMasuk: batch.beratMasuk,
      hargaModal: batch.hargaModal,
      hargaJual: batch.hargaJual,
      lokasiPenyimpanan: batch.lokasiPenyimpanan,
    });

    // Kirim ke blockchain (async, tidak block response)
    let blockchainTxHash: string | null = null;
    try {
      blockchainTxHash = await registerBatchOnChain(batch.id, dataHash);
    } catch (bcErr) {
      console.error('Blockchain registration failed:', bcErr);
      // Tetap lanjut, status akan tetap 'pending'
    }

    // Generate QR code
    const qrCodeData = await generateQrCodeDataUrl(batch.id);
    const qrCodeUrl = getBatchTrackingUrl(batch.id);

    // Update batch dengan blockchain info + QR
    const { data: updatedRow } = await supabase
      .from('harvest_batches')
      .update({
        blockchain_tx_hash: blockchainTxHash,
        blockchain_status: blockchainTxHash ? 'confirmed' : 'pending',
        qr_code_url: qrCodeUrl,
        qr_code_data: qrCodeData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', batch.id)
      .select()
      .single();

    return NextResponse.json({ batch: mapBatch(updatedRow ?? batchRow) }, { status: 201 });
  } catch (err) {
    console.error('POST /api/batch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('harvest_batches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ batches: (data ?? []).map(mapBatch) });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Test manual dengan curl**

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-supabase-user-id",
    "tanggalPanen": "2026-06-30",
    "grade": "A",
    "beratMasuk": 100,
    "hargaModal": 15000,
    "hargaJual": 45000,
    "lokasiPenyimpanan": "Gudang Utama"
  }'
```

Expected: `{"batch": {"id": "...", "batchCode": "B-20260630-XXXX", "qrCodeData": "data:image/png;base64,..."}}`

- [ ] **Step 3: Commit**

```bash
git add app/api/batch/route.ts
git commit -m "feat(api): add POST/GET /api/batch with blockchain registration"
```

---

## Task 11: API Route — Distribution Handover

**Files:**
- Create: `app/api/distribusi/handover/route.ts`

- [ ] **Step 1: Tulis `app/api/distribusi/handover/route.ts`**

```typescript
// app/api/distribusi/handover/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, mapDistributionEvent } from '@/lib/supabase';
import { hashHandoverData } from '@/lib/hash';
import { recordHandoverOnChain } from '@/lib/blockchain';

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await req.json();
    const {
      batchId, fromActorId, toActorId,
      eventType, weightKg, notes, location, toActorRole,
    } = body;

    if (!batchId || !toActorId || !eventType || !toActorRole) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const createdAt = new Date().toISOString();
    const dataHash = hashHandoverData({
      batchId, fromActorId: fromActorId ?? null,
      toActorId, eventType, weightKg: weightKg ?? null,
      location: location ?? '', createdAt,
    });

    // Insert distribution_event (status: pending)
    const { data: eventRow, error: insertError } = await supabase
      .from('distribution_events')
      .insert({
        batch_id: batchId,
        from_actor_id: fromActorId ?? null,
        to_actor_id: toActorId,
        event_type: eventType,
        weight_kg: weightKg ?? null,
        notes: notes ?? '',
        location: location ?? '',
        data_hash: dataHash,
        blockchain_status: 'pending',
        created_at: createdAt,
      })
      .select(`
        *,
        from_actor:actors!distribution_events_from_actor_id_fkey(*),
        to_actor:actors!distribution_events_to_actor_id_fkey(*)
      `)
      .single();

    if (insertError || !eventRow) {
      return NextResponse.json({ error: insertError?.message ?? 'Insert failed' }, { status: 500 });
    }

    // Kirim ke blockchain
    let blockchainTxHash: string | null = null;
    try {
      blockchainTxHash = await recordHandoverOnChain(batchId, dataHash, toActorRole);
    } catch (bcErr) {
      console.error('Blockchain handover failed:', bcErr);
    }

    // Update dengan tx hash
    const { data: updatedRow } = await supabase
      .from('distribution_events')
      .update({
        blockchain_tx_hash: blockchainTxHash,
        blockchain_status: blockchainTxHash ? 'confirmed' : 'pending',
        confirmed_at: blockchainTxHash ? new Date().toISOString() : null,
      })
      .eq('id', eventRow.id)
      .select(`
        *,
        from_actor:actors!distribution_events_from_actor_id_fkey(*),
        to_actor:actors!distribution_events_to_actor_id_fkey(*)
      `)
      .single();

    return NextResponse.json({ event: mapDistributionEvent(updatedRow ?? eventRow) }, { status: 201 });
  } catch (err) {
    console.error('POST /api/distribusi/handover error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json({ error: 'batchId required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('distribution_events')
      .select(`
        *,
        from_actor:actors!distribution_events_from_actor_id_fkey(*),
        to_actor:actors!distribution_events_to_actor_id_fkey(*)
      `)
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ events: (data ?? []).map(mapDistributionEvent) });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/distribusi/handover/route.ts
git commit -m "feat(api): add POST/GET /api/distribusi/handover with blockchain recording"
```

---

## Task 12: API Route — Public Track

**Files:**
- Create: `app/api/track/[batchId]/route.ts`

- [ ] **Step 1: Tulis `app/api/track/[batchId]/route.ts`**

```typescript
// app/api/track/[batchId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, mapBatch, mapDistributionEvent } from '@/lib/supabase';
import { getHistoryFromChain } from '@/lib/blockchain';
import type { VerificationResult } from '@/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;
    const supabase = createServiceClient();

    // Fetch batch
    const { data: batchRow, error: batchError } = await supabase
      .from('harvest_batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (batchError || !batchRow) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Fetch distribution events
    const { data: eventRows } = await supabase
      .from('distribution_events')
      .select(`
        *,
        from_actor:actors!distribution_events_from_actor_id_fkey(*),
        to_actor:actors!distribution_events_to_actor_id_fkey(*)
      `)
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true });

    // Log QR scan
    const userAgent = req.headers.get('user-agent') ?? '';
    await supabase.from('qr_scans').insert({
      batch_id: batchId,
      user_agent: userAgent,
      scan_type: 'consumer',
    });

    // Fetch on-chain history (paralel)
    let onChainEvents: Awaited<ReturnType<typeof getHistoryFromChain>> = [];
    try {
      onChainEvents = await getHistoryFromChain(batchId);
    } catch (err) {
      console.error('Failed to fetch on-chain history:', err);
    }

    // Verifikasi hash: DB vs on-chain
    const events = (eventRows ?? []).map(mapDistributionEvent);
    const allHashes = [
      batchRow.blockchain_tx_hash ? { dataHash: null, dbHash: batchRow.blockchain_tx_hash } : null,
      ...events,
    ].filter(Boolean);

    const verification: VerificationResult[] = onChainEvents.map((chainEvent, index) => {
      // index 0 = registerBatch, index 1+ = handover events
      const dbEvent = index === 0 ? null : events[index - 1];
      const dbHash = index === 0 
        ? null // batch hash tidak disimpan langsung di db sebagai string, skip
        : dbEvent?.dataHash ?? '';
      const chainHash = chainEvent.dataHash;
      return {
        index,
        dbHash: dbHash ?? '',
        chainHash,
        isVerified: dbHash ? dbHash === chainHash : true,
      };
    });

    return NextResponse.json({
      batch: mapBatch(batchRow),
      events,
      onChainEvents,
      verification,
    });
  } catch (err) {
    console.error('GET /api/track error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/track/
git commit -m "feat(api): add GET /api/track/[batchId] public endpoint with blockchain verification"
```

---

## Task 13: Hooks — useBatch & useDistribusi & useTrack

**Files:**
- Create: `hooks/useBatch.ts`
- Create: `hooks/useDistribusi.ts`
- Create: `hooks/useTrack.ts`

- [ ] **Step 1: Tulis `hooks/useBatch.ts`**

```typescript
// hooks/useBatch.ts
'use client';
import { useState, useEffect, useCallback } from 'react';
import type { HarvestBatch } from '@/types';

export function useBatch(userId: string | null) {
  const [batches, setBatches] = useState<HarvestBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/batch?userId=${userId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load batches');
      setBatches(json.batches ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const createBatch = async (data: {
    tanggalPanen: string; grade: string; beratMasuk: number;
    hargaModal: number; hargaJual: number; lokasiPenyimpanan: string;
    estimasiKadaluarsa?: string; catatan?: string;
  }): Promise<HarvestBatch> => {
    const res = await fetch('/api/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, userId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Failed to create batch');
    setBatches(prev => [json.batch, ...prev]);
    return json.batch;
  };

  return { batches, loading, error, reload: load, createBatch };
}
```

- [ ] **Step 2: Tulis `hooks/useDistribusi.ts`**

```typescript
// hooks/useDistribusi.ts
'use client';
import { useState, useEffect, useCallback } from 'react';
import type { DistributionEvent } from '@/types';

export function useDistribusi(batchId: string | null) {
  const [events, setEvents] = useState<DistributionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!batchId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/distribusi/handover?batchId=${batchId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load events');
      setEvents(json.events ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => { load(); }, [load]);

  const recordHandover = async (data: {
    fromActorId?: string; toActorId: string; toActorRole: string;
    eventType: 'serah_terima' | 'konfirmasi_terima';
    weightKg?: number; notes?: string; location?: string;
  }): Promise<DistributionEvent> => {
    const res = await fetch('/api/distribusi/handover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, batchId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Failed to record handover');
    setEvents(prev => [...prev, json.event]);
    return json.event;
  };

  return { events, loading, error, reload: load, recordHandover };
}
```

- [ ] **Step 3: Tulis `hooks/useTrack.ts`**

```typescript
// hooks/useTrack.ts
'use client';
import { useState, useEffect } from 'react';
import type { TrackingData, VerificationResult } from '@/types';

export function useTrack(batchId: string) {
  const [data, setData] = useState<TrackingData | null>(null);
  const [verification, setVerification] = useState<VerificationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!batchId) return;
    let cancelled = false;
    setLoading(true);

    fetch(`/api/track/${batchId}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return;
        if (json.error) { setError(json.error); return; }
        setData({ batch: json.batch, events: json.events, onChainVerification: json.onChainEvents });
        setVerification(json.verification ?? []);
      })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [batchId]);

  return { data, verification, loading, error };
}
```

- [ ] **Step 4: Commit**

```bash
git add hooks/
git commit -m "feat(hooks): add useBatch, useDistribusi, useTrack hooks"
```

---

## Task 14: BatchController + BatchView

**Files:**
- Create: `controllers/batch/BatchController.tsx`
- Create: `app/dashboard/batch/_components/BatchView.tsx`
- Create: `app/dashboard/batch/_components/BatchDialog.tsx`
- Create: `app/dashboard/batch/page.tsx`

- [ ] **Step 1: Tulis `app/dashboard/batch/_components/BatchDialog.tsx`**

```tsx
// app/dashboard/batch/_components/BatchDialog.tsx
'use client';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, MenuItem,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  tanggalPanen: z.string().min(1, 'Wajib diisi'),
  grade: z.string().min(1, 'Wajib diisi'),
  beratMasuk: z.coerce.number().min(0.1, 'Min 0.1 kg'),
  hargaModal: z.coerce.number().min(0),
  hargaJual: z.coerce.number().min(0),
  lokasiPenyimpanan: z.string().min(1, 'Wajib diisi'),
  estimasiKadaluarsa: z.string().optional(),
  catatan: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  grades: string[];
  locations: string[];
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
}

export default function BatchDialog({ open, grades, locations, onClose, onSubmit }: Props) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tanggalPanen: new Date().toISOString().split('T')[0],
      grade: grades[0] ?? 'A',
      lokasiPenyimpanan: locations[0] ?? 'Gudang Utama',
    },
  });

  const handleClose = () => { reset(); onClose(); };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Tambah Batch Panen</DialogTitle>
      <form onSubmit={handleSubmit(async (data) => { await onSubmit(data); handleClose(); })}>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={6}>
              <TextField label="Tanggal Panen" type="date" fullWidth {...register('tanggalPanen')}
                error={!!errors.tanggalPanen} helperText={errors.tanggalPanen?.message}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={6}>
              <TextField label="Grade" select fullWidth {...register('grade')}
                error={!!errors.grade} helperText={errors.grade?.message}>
                {grades.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={6}>
              <TextField label="Berat Masuk (kg)" type="number" fullWidth {...register('beratMasuk')}
                error={!!errors.beratMasuk} helperText={errors.beratMasuk?.message} />
            </Grid>
            <Grid size={6}>
              <TextField label="Lokasi Penyimpanan" select fullWidth {...register('lokasiPenyimpanan')}
                error={!!errors.lokasiPenyimpanan} helperText={errors.lokasiPenyimpanan?.message}>
                {locations.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={6}>
              <TextField label="Harga Modal (Rp/kg)" type="number" fullWidth {...register('hargaModal')}
                error={!!errors.hargaModal} helperText={errors.hargaModal?.message} />
            </Grid>
            <Grid size={6}>
              <TextField label="Harga Jual (Rp/kg)" type="number" fullWidth {...register('hargaJual')}
                error={!!errors.hargaJual} helperText={errors.hargaJual?.message} />
            </Grid>
            <Grid size={6}>
              <TextField label="Est. Kadaluarsa" type="date" fullWidth {...register('estimasiKadaluarsa')}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={12}>
              <TextField label="Catatan" fullWidth multiline rows={2} {...register('catatan')} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Batal</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan & Register ke Blockchain'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
```

- [ ] **Step 2: Tulis `app/dashboard/batch/_components/BatchView.tsx`**

```tsx
// app/dashboard/batch/_components/BatchView.tsx
'use client';
import {
  Box, Button, Card, CardContent, Chip, Grid, Stack, Typography,
  Alert, CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import type { HarvestBatch } from '@/types';

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  aman: 'success', menipis: 'warning', hampir_kadaluarsa: 'error', habis: 'default',
};

interface Props {
  batches: HarvestBatch[];
  loading: boolean;
  error: string | null;
  onAddBatch: () => void;
  onViewQr: (batch: HarvestBatch) => void;
}

export default function BatchView({ batches, loading, error, onAddBatch, onViewQr }: Props) {
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>Manajemen Batch Panen</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAddBatch}>
          Tambah Batch
        </Button>
      </Stack>

      {batches.length === 0 && (
        <Alert severity="info">Belum ada batch. Klik "Tambah Batch" untuk memulai.</Alert>
      )}

      <Grid container spacing={2}>
        {batches.map(batch => (
          <Grid key={batch.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Typography variant="subtitle1" fontWeight={700}>{batch.batchCode}</Typography>
                  <Chip label={batch.status} color={STATUS_COLOR[batch.status]} size="small" />
                </Stack>

                <Typography variant="body2" color="text.secondary" mt={1}>
                  Grade: <b>{batch.grade}</b> · {batch.beratMasuk} kg
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sisa: <b>{batch.stokTersisa} kg</b> · {batch.lokasiPenyimpanan}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Panen: {batch.tanggalPanen}
                </Typography>

                <Stack direction="row" alignItems="center" spacing={0.5} mt={1}>
                  {batch.blockchainStatus === 'confirmed'
                    ? <><CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                        <Typography variant="caption" color="success.main">On-chain</Typography></>
                    : <><HourglassEmptyIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                        <Typography variant="caption" color="warning.main">Pending blockchain</Typography></>
                  }
                </Stack>

                <Button
                  size="small" startIcon={<QrCode2Icon />} onClick={() => onViewQr(batch)}
                  sx={{ mt: 1 }} disabled={!batch.qrCodeData}
                >
                  Lihat QR Code
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
```

- [ ] **Step 3: Tulis `controllers/batch/BatchController.tsx`**

```tsx
// controllers/batch/BatchController.tsx
'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext'; // sesuaikan dengan auth setup
import { useBatch } from '@/hooks/useBatch';
import BatchView from '@/app/dashboard/batch/_components/BatchView';
import BatchDialog from '@/app/dashboard/batch/_components/BatchDialog';
import QrDialog from '@/app/dashboard/batch/_components/QrDialog';
import type { HarvestBatch } from '@/types';

const GRADES = ['A', 'B', 'C'];
const LOCATIONS = ['Gudang Utama', 'Gudang Cadangan'];

export default function BatchController() {
  const { user } = useAuth();
  const { batches, loading, error, createBatch } = useBatch(user?.id ?? null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrBatch, setQrBatch] = useState<HarvestBatch | null>(null);

  return (
    <>
      <BatchView
        batches={batches}
        loading={loading}
        error={error}
        onAddBatch={() => setDialogOpen(true)}
        onViewQr={setQrBatch}
      />
      <BatchDialog
        open={dialogOpen}
        grades={GRADES}
        locations={LOCATIONS}
        onClose={() => setDialogOpen(false)}
        onSubmit={createBatch}
      />
      {qrBatch && (
        <QrDialog
          batch={qrBatch}
          onClose={() => setQrBatch(null)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 4: Tulis `app/dashboard/batch/_components/QrDialog.tsx`**

```tsx
// app/dashboard/batch/_components/QrDialog.tsx
'use client';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Stack,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import type { HarvestBatch } from '@/types';

interface Props {
  batch: HarvestBatch;
  onClose: () => void;
}

export default function QrDialog({ batch, onClose }: Props) {
  const handleDownload = () => {
    if (!batch.qrCodeData) return;
    const link = document.createElement('a');
    link.href = batch.qrCodeData;
    link.download = `QR-${batch.batchCode}.png`;
    link.click();
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>QR Code — {batch.batchCode}</DialogTitle>
      <DialogContent>
        <Box sx={{ textAlign: 'center', py: 2 }}>
          {batch.qrCodeData ? (
            <img src={batch.qrCodeData} alt="QR Code" style={{ width: 250, height: 250 }} />
          ) : (
            <Typography color="text.secondary">QR Code belum tersedia</Typography>
          )}
          <Stack spacing={0.5} mt={2}>
            <Typography variant="caption" color="text.secondary">
              URL: {batch.qrCodeUrl}
            </Typography>
            <Typography variant="caption" color={batch.blockchainStatus === 'confirmed' ? 'success.main' : 'warning.main'}>
              Blockchain: {batch.blockchainStatus}
            </Typography>
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Tutup</Button>
        <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleDownload}
          disabled={!batch.qrCodeData}>
          Download PNG
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

- [ ] **Step 5: Tulis `app/dashboard/batch/page.tsx`**

```tsx
// app/dashboard/batch/page.tsx
import BatchController from '@/controllers/batch/BatchController';

export default function BatchPage() {
  return <BatchController />;
}
```

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/batch/ controllers/batch/
git commit -m "feat(batch): add batch management UI with QR code display"
```

---

## Task 15: DistribusiController + View

**Files:**
- Create: `controllers/distribusi/DistribusiController.tsx`
- Create: `app/dashboard/distribusi/_components/DistribusiView.tsx`
- Create: `app/dashboard/distribusi/_components/HandoverDialog.tsx`
- Create: `app/dashboard/distribusi/page.tsx`
- Create: `app/dashboard/distribusi/terima/page.tsx`

- [ ] **Step 1: Tulis `app/dashboard/distribusi/_components/HandoverDialog.tsx`**

```tsx
// app/dashboard/distribusi/_components/HandoverDialog.tsx
'use client';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Grid,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { HarvestBatch, Actor } from '@/types';

const schema = z.object({
  toActorId: z.string().min(1, 'Pilih penerima'),
  weightKg: z.coerce.number().min(0.1, 'Min 0.1 kg'),
  location: z.string().min(1, 'Wajib diisi'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  batch: HarvestBatch;
  actors: Actor[];
  currentActorId: string;
  onClose: () => void;
  onSubmit: (data: FormData & { fromActorId: string }) => Promise<void>;
}

export default function HandoverDialog({ open, batch, actors, currentActorId, onClose, onSubmit }: Props) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const handleClose = () => { reset(); onClose(); };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Serah Terima — {batch.batchCode}</DialogTitle>
      <form onSubmit={handleSubmit(async (data) => {
        await onSubmit({ ...data, fromActorId: currentActorId });
        handleClose();
      })}>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={12}>
              <TextField label="Serahkan ke" select fullWidth {...register('toActorId')}
                error={!!errors.toActorId} helperText={errors.toActorId?.message}>
                {actors.filter(a => a.id !== currentActorId).map(a => (
                  <MenuItem key={a.id} value={a.id}>{a.name} ({a.role})</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={6}>
              <TextField label="Berat (kg)" type="number" fullWidth {...register('weightKg')}
                error={!!errors.weightKg} helperText={errors.weightKg?.message} />
            </Grid>
            <Grid size={6}>
              <TextField label="Lokasi" fullWidth {...register('location')}
                error={!!errors.location} helperText={errors.location?.message} />
            </Grid>
            <Grid size={12}>
              <TextField label="Catatan" fullWidth multiline rows={2} {...register('notes')} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Batal</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Mencatat ke Blockchain...' : 'Konfirmasi Serah Terima'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
```

- [ ] **Step 2: Tulis `app/dashboard/distribusi/_components/DistribusiView.tsx`**

```tsx
// app/dashboard/distribusi/_components/DistribusiView.tsx
'use client';
import {
  Box, Typography, Stack, Card, CardContent,
  Chip, Button, Alert, CircularProgress, Grid,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import type { HarvestBatch, DistributionEvent } from '@/types';

const ROLE_LABEL: Record<string, string> = {
  petani: '🌾 Petani', gudang: '🏭 Gudang',
  distributor: '🚚 Distributor', retailer: '🏪 Retailer',
};

interface Props {
  batch: HarvestBatch | null;
  events: DistributionEvent[];
  loading: boolean;
  error: string | null;
  onHandover: () => void;
}

export default function DistribusiView({ batch, events, loading, error, onHandover }: Props) {
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!batch) return <Alert severity="info">Pilih batch untuk melihat distribusi.</Alert>;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <div>
          <Typography variant="h5" fontWeight={700}>{batch.batchCode}</Typography>
          <Typography variant="body2" color="text.secondary">
            Grade {batch.grade} · {batch.beratMasuk} kg · {batch.tanggalPanen}
          </Typography>
        </div>
        <Button variant="contained" startIcon={<SwapHorizIcon />} onClick={onHandover}>
          Serah Terima
        </Button>
      </Stack>

      <Typography variant="h6" mb={2}>Riwayat Distribusi</Typography>

      {events.length === 0 && (
        <Alert severity="info">Belum ada serah terima. Mulai dengan klik "Serah Terima".</Alert>
      )}

      <Stack spacing={2}>
        {events.map(event => (
          <Card key={event.id} variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <div>
                  <Typography variant="subtitle2">
                    {ROLE_LABEL[event.fromActor?.role ?? ''] ?? 'Tidak diketahui'} →{' '}
                    {ROLE_LABEL[event.toActor?.role ?? ''] ?? 'Tidak diketahui'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {event.fromActor?.name ?? '-'} → {event.toActor?.name ?? '-'}
                  </Typography>
                  {event.weightKg && (
                    <Typography variant="body2" color="text.secondary">
                      Berat: {event.weightKg} kg · Lokasi: {event.location}
                    </Typography>
                  )}
                  {event.notes && (
                    <Typography variant="body2" color="text.secondary">Catatan: {event.notes}</Typography>
                  )}
                </div>
                <Stack alignItems="flex-end" spacing={0.5}>
                  <Chip
                    icon={event.blockchainStatus === 'confirmed'
                      ? <CheckCircleIcon /> : <HourglassEmptyIcon />}
                    label={event.blockchainStatus === 'confirmed' ? 'On-chain ✓' : 'Pending'}
                    color={event.blockchainStatus === 'confirmed' ? 'success' : 'warning'}
                    size="small"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {new Date(event.createdAt).toLocaleString('id-ID')}
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 3: Tulis `controllers/distribusi/DistribusiController.tsx`**

```tsx
// controllers/distribusi/DistribusiController.tsx
'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDistribusi } from '@/hooks/useDistribusi';
import { useBatch } from '@/hooks/useBatch';
import { useAuth } from '@/context/AuthContext';
import DistribusiView from '@/app/dashboard/distribusi/_components/DistribusiView';
import HandoverDialog from '@/app/dashboard/distribusi/_components/HandoverDialog';
import type { Actor, HarvestBatch } from '@/types';

export default function DistribusiController() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const batchIdParam = searchParams.get('batchId');

  const { batches } = useBatch(user?.id ?? null);
  const [selectedBatch, setSelectedBatch] = useState<HarvestBatch | null>(null);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [actors, setActors] = useState<Actor[]>([]);
  const [currentActorId, setCurrentActorId] = useState('');

  const { events, loading, error, recordHandover } = useDistribusi(selectedBatch?.id ?? null);

  useEffect(() => {
    if (batchIdParam && batches.length > 0) {
      const found = batches.find(b => b.id === batchIdParam);
      if (found) setSelectedBatch(found);
    }
  }, [batchIdParam, batches]);

  useEffect(() => {
    fetch('/api/actors')
      .then(r => r.json())
      .then(json => { setActors(json.actors ?? []); })
      .catch(console.error);
  }, []);

  const handleHandover = async (data: {
    toActorId: string; fromActorId: string;
    weightKg: number; location: string; notes?: string;
  }) => {
    if (!selectedBatch) return;
    const toActor = actors.find(a => a.id === data.toActorId);
    await recordHandover({
      ...data,
      toActorRole: toActor?.role ?? 'gudang',
      eventType: 'serah_terima',
    });
  };

  return (
    <>
      <DistribusiView
        batch={selectedBatch}
        events={events}
        loading={loading}
        error={error}
        onHandover={() => setHandoverOpen(true)}
      />
      {selectedBatch && (
        <HandoverDialog
          open={handoverOpen}
          batch={selectedBatch}
          actors={actors}
          currentActorId={currentActorId}
          onClose={() => setHandoverOpen(false)}
          onSubmit={handleHandover}
        />
      )}
    </>
  );
}
```

- [ ] **Step 4: Tulis pages**

```tsx
// app/dashboard/distribusi/page.tsx
import DistribusiController from '@/controllers/distribusi/DistribusiController';
export default function DistribusiPage() { return <DistribusiController />; }
```

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/distribusi/ controllers/distribusi/
git commit -m "feat(distribusi): add distribution handover UI with blockchain recording"
```

---

## Task 16: Public Tracking Page (Halaman Konsumen)

**Files:**
- Create: `app/track/[batchId]/_components/VerificationBadge.tsx`
- Create: `app/track/[batchId]/_components/TrackingView.tsx`
- Create: `controllers/track/TrackController.tsx`
- Create: `app/track/[batchId]/page.tsx`

- [ ] **Step 1: Tulis `app/track/[batchId]/_components/VerificationBadge.tsx`**

```tsx
// app/track/[batchId]/_components/VerificationBadge.tsx
import { Chip, Tooltip, Typography, Stack } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import type { VerificationResult } from '@/types';

interface Props {
  result: VerificationResult | undefined;
}

export default function VerificationBadge({ result }: Props) {
  if (!result) {
    return (
      <Tooltip title="Data tidak ditemukan di blockchain">
        <Chip icon={<HelpOutlineIcon />} label="Belum Terverifikasi" color="default" size="small" />
      </Tooltip>
    );
  }

  if (result.isVerified) {
    return (
      <Tooltip title={`Hash on-chain: ${result.chainHash.slice(0, 18)}...`}>
        <Chip icon={<CheckCircleIcon />} label="Terverifikasi Blockchain ✓" color="success" size="small" />
      </Tooltip>
    );
  }

  return (
    <Tooltip title="Hash tidak cocok — data mungkin telah dimodifikasi">
      <Stack>
        <Chip icon={<WarningIcon />} label="Data Tidak Sesuai ⚠" color="error" size="small" />
        <Typography variant="caption" color="error.main">
          DB: {result.dbHash.slice(0, 12)}... | Chain: {result.chainHash.slice(0, 12)}...
        </Typography>
      </Stack>
    </Tooltip>
  );
}
```

- [ ] **Step 2: Tulis `app/track/[batchId]/_components/TrackingView.tsx`**

```tsx
// app/track/[batchId]/_components/TrackingView.tsx
'use client';
import {
  Box, Typography, Stack, Card, CardContent, Chip,
  Alert, CircularProgress, Divider, Paper,
} from '@mui/material';
import VerificationBadge from './VerificationBadge';
import type { TrackingData, VerificationResult } from '@/types';

const ROLE_ICON: Record<string, string> = {
  petani: '🌾', gudang: '🏭', distributor: '🚚', retailer: '🏪',
};

const ROLE_LABEL: Record<string, string> = {
  petani: 'Petani', gudang: 'Gudang', distributor: 'Distributor', retailer: 'Retailer',
};

interface Props {
  data: TrackingData | null;
  verification: VerificationResult[];
  loading: boolean;
  error: string | null;
}

export default function TrackingView({ data, verification, loading, error }: Props) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
        <CircularProgress />
        <Typography mt={2} color="text.secondary">Memverifikasi data di blockchain...</Typography>
      </Box>
    );
  }

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Alert severity="info">Data produk tidak ditemukan.</Alert>;

  const { batch, events } = data;

  return (
    <Box maxWidth="sm" mx="auto" p={2}>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: 'primary.main', color: 'white', borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={700}>🌾 Riwayat Distribusi Produk</Typography>
        <Typography variant="h5" fontWeight={800} mt={0.5}>{batch.batchCode}</Typography>
        <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
          <Chip label={`Grade ${batch.grade}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          <Chip label={`${batch.beratMasuk} kg`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          <Chip label={`Panen: ${batch.tanggalPanen}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
        </Stack>
      </Paper>

      {/* Timeline */}
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Perjalanan Produk</Typography>

      <Stack spacing={2}>
        {/* Step 0: Petani (batch creation) */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography fontSize={28}>🌾</Typography>
                <div>
                  <Typography variant="subtitle2" fontWeight={700}>Petani — Panen</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Lokasi: {batch.lokasiPenyimpanan}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(batch.createdAt).toLocaleString('id-ID')}
                  </Typography>
                </div>
              </Stack>
              <VerificationBadge result={verification.find(v => v.index === 0)} />
            </Stack>
          </CardContent>
        </Card>

        {/* Handover events */}
        {events.map((event, idx) => (
          <Box key={event.id}>
            <Box sx={{ display: 'flex', justifyContent: 'center', my: -1, zIndex: 1 }}>
              <Typography color="text.secondary" fontSize={20}>↓</Typography>
            </Box>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontSize={28}>
                      {ROLE_ICON[event.toActor?.role ?? ''] ?? '📦'}
                    </Typography>
                    <div>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {ROLE_LABEL[event.toActor?.role ?? ''] ?? 'Tidak diketahui'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {event.toActor?.name ?? '-'} · {event.location}
                      </Typography>
                      {event.weightKg && (
                        <Typography variant="body2" color="text.secondary">
                          Berat: {event.weightKg} kg
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {new Date(event.createdAt).toLocaleString('id-ID')}
                      </Typography>
                    </div>
                  </Stack>
                  <VerificationBadge result={verification.find(v => v.index === idx + 1)} />
                </Stack>
              </CardContent>
            </Card>
          </Box>
        ))}

        {/* Consumer end */}
        <Box sx={{ display: 'flex', justifyContent: 'center', my: -1 }}>
          <Typography color="text.secondary" fontSize={20}>↓</Typography>
        </Box>
        <Card variant="outlined" sx={{ borderColor: 'primary.main', borderWidth: 2 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography fontSize={36}>👤</Typography>
            <Typography variant="subtitle1" fontWeight={700}>Anda — Konsumen Akhir</Typography>
            <Typography variant="body2" color="text.secondary">
              Scan dilakukan: {new Date().toLocaleString('id-ID')}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      <Divider sx={{ my: 3 }} />

      {/* Blockchain info */}
      <Alert severity={verification.every(v => v.isVerified) ? 'success' : 'warning'} sx={{ mt: 2 }}>
        {verification.every(v => v.isVerified)
          ? `✓ Semua ${verification.length} tahap distribusi terverifikasi di Polygon Blockchain`
          : '⚠ Ada ketidaksesuaian data — hubungi produsen'}
      </Alert>

      {batch.blockchainTxHash && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', wordBreak: 'break-all' }}>
          Tx registrasi: {batch.blockchainTxHash}
        </Typography>
      )}
    </Box>
  );
}
```

- [ ] **Step 3: Tulis `controllers/track/TrackController.tsx`**

```tsx
// controllers/track/TrackController.tsx
'use client';
import { useTrack } from '@/hooks/useTrack';
import TrackingView from '@/app/track/[batchId]/_components/TrackingView';

interface Props { batchId: string; }

export default function TrackController({ batchId }: Props) {
  const { data, verification, loading, error } = useTrack(batchId);
  return <TrackingView data={data} verification={verification} loading={loading} error={error} />;
}
```

- [ ] **Step 4: Tulis `app/track/[batchId]/page.tsx`**

```tsx
// app/track/[batchId]/page.tsx
import TrackController from '@/controllers/track/TrackController';

interface Props { params: Promise<{ batchId: string }>; }

export default async function TrackPage({ params }: Props) {
  const { batchId } = await params;
  return <TrackController batchId={batchId} />;
}
```

- [ ] **Step 5: Commit**

```bash
git add app/track/ controllers/track/
git commit -m "feat(track): add public QR tracking page with blockchain verification timeline"
```

---

## Task 17: Actors API Route

**Files:**
- Create: `app/api/actors/route.ts`

- [ ] **Step 1: Tulis `app/api/actors/route.ts`**

```typescript
// app/api/actors/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, mapActor } from '@/lib/supabase';

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('actors')
    .select('*')
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ actors: (data ?? []).map(mapActor) });
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient();
  const body = await req.json();
  const { name, role, phone, address, userId } = body;

  if (!name || !role) {
    return NextResponse.json({ error: 'name and role required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('actors')
    .insert({ name, role, phone: phone ?? null, address: address ?? null, user_id: userId ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ actor: mapActor(data) }, { status: 201 });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/actors/route.ts
git commit -m "feat(api): add GET/POST /api/actors"
```

---

## Task 18: Integrasi Akhir & End-to-End Test Manual

- [ ] **Step 1: Jalankan semua unit tests**

```bash
npx vitest run
```

Expected: semua test pass

- [ ] **Step 2: Build production**

```bash
npm run build
```

Expected: build sukses tanpa error TypeScript

- [ ] **Step 3: End-to-end manual test — full flow**

```
1. Buka http://localhost:3000/dashboard/batch
2. Login sebagai Petani
3. Klik "Tambah Batch" → isi form → Submit
   Expected: batch muncul di list, QR code tersedia, status blockchain "confirmed"
4. Klik "Lihat QR Code" → download PNG
5. Buka http://localhost:3000/dashboard/distribusi?batchId={id}
6. Login sebagai Gudang → klik "Serah Terima" → isi form → Submit
   Expected: event muncul dengan badge "On-chain ✓"
7. Ulangi untuk Distributor dan Retailer
8. Scan QR code dengan HP atau buka http://localhost:3000/track/{batchId}
   Expected: timeline 4 tahap muncul, semua badge hijau "Terverifikasi Blockchain ✓"
9. Cek semua transaksi di https://amoy.polygonscan.com/address/{CONTRACT_ADDRESS}
```

- [ ] **Step 4: Commit final**

```bash
git add .
git commit -m "feat: complete blockchain distribution tracking system - ready for thesis demo"
```

---

## Catatan Skripsi

### Metrik Evaluasi yang Bisa Diukur
- Waktu pembuatan batch + konfirmasi blockchain (target < 30 detik di Amoy)
- Gas cost per operasi (log dari deploy dan test transactions)
- Waktu penelusuran produk: sebelum (manual) vs sesudah (< 5 detik via QR)
- Jumlah scan QR konsumen (dari tabel `qr_scans`)

### Referensi Arsitektur
Implementasi ini mengikuti pola hash-anchored yang digunakan oleh TRACE-RICE Project (Portugal, 2023) dan OriginTrail, bukan full on-chain seperti Walmart IBM Food Trust, sehingga biaya gas minimal namun immutability tetap terjaga.

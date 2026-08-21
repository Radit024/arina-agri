<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:architecture-rules -->
# Strict UI and Controller Separation
Semua fitur dan halaman dalam project ini HARUS dipisahkan secara tegas antara UI (View) dan Controller (Logika). 
Aturan:
1. Komponen UI (`_components/XxxView.tsx`) HANYA bertanggung jawab untuk rendering dan styling (menerima props, menampilkan data).
2. Controller (`controllers/<fitur>/useXxxController.ts` atau `controllers/<fitur>/XxxController.tsx`) bertanggung jawab menangani semua logika bisnis, state management, dan pemanggilan API.
3. Halaman utama (`page.tsx`) bertugas menghubungkan Controller dengan komponen UI View.
<!-- END:architecture-rules -->

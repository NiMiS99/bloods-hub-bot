'use client';

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
        <p className="text-dark-300 text-sm">Caricamento...</p>
      </div>
    </div>
  );
}

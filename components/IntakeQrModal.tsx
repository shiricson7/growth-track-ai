'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X } from 'lucide-react';

interface IntakeQrModalProps {
  open: boolean;
  url: string;
  expiresAt?: string;
  onClose: () => void;
  title?: string;
}

const IntakeQrModal: React.FC<IntakeQrModalProps> = ({ open, url, expiresAt, onClose, title }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setDataUrl(null);
    QRCode.toDataURL(
      url,
      { width: 280, margin: 2 },
      (err, generated) => {
        if (cancelled) return;
        if (err) {
          console.error('Failed to generate QR', err);
          setDataUrl(null);
          return;
        }
        setDataUrl(generated);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [open, url]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title || '문진 QR 코드'}</h2>
            <p className="text-sm text-slate-500 mt-1">휴대폰 카메라로 QR을 스캔해 문진을 작성하세요.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="닫기"
          >
            <X size={16} className="mx-auto" />
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center">
          {dataUrl ? (
            <img src={dataUrl} alt="문진 QR 코드" className="h-64 w-64" />
          ) : (
            <div className="h-64 w-64 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400">
              QR 생성 중...
            </div>
          )}

          <div className="mt-5 w-full">
            <label className="text-xs font-semibold text-slate-500">문진 링크</label>
            <div className="mt-2 flex gap-2">
              <input
                value={url}
                readOnly
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={() => navigator?.clipboard?.writeText?.(url)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                복사
              </button>
            </div>
            {expiresAt && (
              <p className="mt-2 text-xs text-slate-400">만료: {new Date(expiresAt).toLocaleString('ko-KR')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntakeQrModal;

"use client";
import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";

type Area = { x: number; y: number; width: number; height: number };

async function getCroppedImage(imageSrc: string, crop: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9));
}

export default function ImageCropUpload({ bucket, value, onChange, label = "Image" }: { bucket: string; value?: string; onChange: (url: string) => void; label?: string }) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [loading, setLoading] = useState(false);
  const onCropComplete = useCallback((_area: Area, pixels: Area) => setCroppedAreaPixels(pixels), []);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageSrc(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function upload() {
    if (!imageSrc || !croppedAreaPixels) return;
    setLoading(true);
    const blob = await getCroppedImage(imageSrc, croppedAreaPixels);
    const form = new FormData();
    form.append("bucket", bucket);
    form.append("image", blob, `upload-${Date.now()}.jpg`);
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) return alert(json.error || "Upload failed");
    onChange(json.url);
    setImageSrc(null);
  }

  return <div className="space-y-3">
    <label className="admin-label">{label}</label>
    {value && <img src={value} alt="Preview" className="h-40 w-full rounded-lg object-cover" />}
    <input type="file" accept="image/*" onChange={onFile} className="admin-input" />
    {imageSrc && <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="relative h-72 w-full overflow-hidden rounded-lg bg-slate-900">
        <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={16/9} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e)=>setZoom(Number(e.target.value))} />
        <button type="button" onClick={upload} disabled={loading} className="btn-primary py-2">{loading ? "Uploading..." : "Crop & Upload"}</button>
        <button type="button" onClick={()=>setImageSrc(null)} className="btn-secondary py-2">Cancel</button>
      </div>
    </div>}
  </div>
}

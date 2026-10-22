"use client";

import { useState, useRef } from "react";
import Image from "next/image";

interface DirectImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder?: "products" | "categories" | "collections" | "cms";
  label?: string;
  aspectRatio?: string;
  height?: string;
}

export function DirectImageUpload({
  value,
  onChange,
  folder = "products",
  label = "Image Upload",
  aspectRatio = "3/4",
  height = "160px",
}: DirectImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (JPG, PNG, WebP, AVIF).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("Image file size exceeds the 10MB limit.");
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await fetch("/api/v1/admin/media/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to upload image.");
      }

      const uploadedUrl = json.data?.publicUrl || json.data?.key;
      if (uploadedUrl) {
        onChange(uploadedUrl);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && (
        <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary, #2c2621)" }}>
          {label}
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
          }
        }}
      />

      {value ? (
        <div
          style={{
            position: "relative",
            borderRadius: "8px",
            border: "1px solid var(--border-light, #e8dfd5)",
            overflow: "hidden",
            backgroundColor: "#f7f4ee",
            padding: "8px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "80px",
              height: height,
              borderRadius: "6px",
              overflow: "hidden",
              backgroundColor: "#ece6dd",
              flexShrink: 0,
            }}
          >
            <Image
              src={value}
              alt="Uploaded preview"
              fill
              style={{ objectFit: "cover" }}
              unoptimized={value.startsWith("http://") || value.startsWith("https://")}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#205a3c",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>✓</span> Image Uploaded
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-muted, #8c7d70)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                marginTop: "2px",
              }}
            >
              {value}
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                style={{
                  padding: "5px 12px",
                  fontSize: "11px",
                  fontWeight: 500,
                  backgroundColor: "var(--btn-dark, #2e3830)",
                  color: "#f7f4ee",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {isUploading ? "Uploading..." : "Replace Image"}
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                disabled={isUploading}
                style={{
                  padding: "5px 10px",
                  fontSize: "11px",
                  backgroundColor: "#fff",
                  color: "#842029",
                  border: "1px solid #f5c6cb",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: isDragOver
              ? "2px dashed var(--btn-dark, #2e3830)"
              : "1px dashed var(--border-light, #d8cebe)",
            borderRadius: "8px",
            padding: "24px 16px",
            textAlign: "center",
            backgroundColor: isDragOver ? "#f0ede6" : "#fdfbf7",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          {isUploading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  border: "2px solid #e8dfd5",
                  borderTopColor: "var(--btn-dark, #2e3830)",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              <span style={{ fontSize: "12px", color: "var(--text-muted, #8c7d70)" }}>
                Uploading image directly to storage...
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                style={{ width: "28px", height: "28px", color: "#8c7d70" }}
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary, #2c2621)" }}>
                Click to browse or drag &amp; drop image here
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted, #8c7d70)" }}>
                PNG, JPG, WebP or AVIF (Up to 10MB)
              </div>
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div style={{ fontSize: "11px", color: "#842029", marginTop: "2px" }}>
          {errorMessage}
        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";
import Cropper from "react-easy-crop";
import { useAuth } from "../context/AuthContext";

export default function AvatarUpload() {
  const { user, updateAvatar } = useAuth();

  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const handleSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    // for now we just save the image directly (no real cropping math to keep it simple)
    updateAvatar(imageSrc);
    setImageSrc(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      
      {/* CURRENT AVATAR */}
      <img
        src={user?.avatarUrl || "/assets/default.png"}
        alt="avatar"
        style={{
          width: 60,
          height: 60,
          borderRadius: "50%",
          objectFit: "cover",
          border: "2px solid #e06c3a"
        }}
      />

      {/* SELECT IMAGE */}
      <input type="file" accept="image/*" onChange={handleSelect} />

      {/* PREVIEW + CROP */}
      {imageSrc && (
        <div style={{ position: "relative", width: 200, height: 200 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
          />
        </div>
      )}

      {/* ZOOM */}
      {imageSrc && (
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(e.target.value)}
        />
      )}

      {/* SAVE */}
      {imageSrc && (
        <button
          onClick={handleSave}
          style={{
            background: "#e06c3a",
            border: "none",
            padding: "8px",
            borderRadius: 6,
            color: "#fff",
            cursor: "pointer"
          }}
        >
          Save Avatar
        </button>
      )}
    </div>
  );
}
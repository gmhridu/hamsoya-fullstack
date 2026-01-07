"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  deleteImageFromImageKit,
  getOptimizedImageUrl,
  uploadProfileImage,
  validateImageFile,
} from "@/lib/imagekit";
import { cn } from "@/lib/utils";
import { useProfileImageStore } from "@/store/use-profile-image-store";
import { CameraIcon, CheckIcon, UploadCloudIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface ProfileImageUploadProps {
  userId?: string;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  onImageUpload?: (url: string, fileId: string) => void;
  onImageRemove?: () => void;
  preserveOnUnmount?: boolean;
  resetTrigger?: boolean;
}

export function ProfileImageUpload({
  userId,
  size = "md",
  disabled = false,
  onImageUpload,
  onImageRemove,
  preserveOnUnmount = false,
  resetTrigger,
}: ProfileImageUploadProps) {
  const fileId = useProfileImageStore((s) => s.fileId);
  const url = useProfileImageStore((s) => s.url);
  const isUploaded = useProfileImageStore((s) => s.isUploaded);
  const setImage = useProfileImageStore((s) => s.setImage);
  const removeImage = useProfileImageStore((s) => s.removeImage);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = { sm: "w-16 h-16", md: "w-24 h-24", lg: "w-32 h-32" };
  const iconSizes = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" };

  useEffect(() => {
    if (resetTrigger) {
      removeImage();
    }
  }, [resetTrigger, removeImage]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (disabled) return;

      const validation = validateImageFile(file);
      if (!validation.isValid) {
        toast.error(validation.error || "Invalid image file");
        return;
      }

      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
      setIsUploading(true);
      setUploadProgress(0);
      setUploadStatus("Preparing upload...");

      try {
        const result = await uploadProfileImage(
          file,
          userId || "anonymous",
          (progress) => {
            setUploadProgress(progress);
            if (progress < 10) setUploadStatus("Compressing image...");
            else if (progress < 100)
              setUploadStatus(`Uploading... ${progress}%`);
            else setUploadStatus("Processing...");
          }
        );

        setImage(result.url, result.fileId);
        onImageUpload?.(result.url, result.fileId);
        URL.revokeObjectURL(preview);
        setPreviewUrl(null);
        toast.success("Profile image uploaded successfully!");
      } catch (error) {
        console.error("Upload error:", error);
        toast.error(
          `Upload failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        URL.revokeObjectURL(preview);
        setPreviewUrl(null);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatus("");
      }
    },
    [disabled, userId, setImage, onImageUpload]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = Array.from(e.dataTransfer.files).find((f) =>
        f.type.startsWith("image/")
      );
      if (file) handleFileSelect(file);
      else toast.error("Please drop an image file");
    },
    [disabled, handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleRemoveImage = useCallback(async () => {
    const currentFileId = fileId;
    removeImage();
    onImageRemove?.();

    try {
      if (currentFileId) {
        await deleteImageFromImageKit(currentFileId);
      }
      toast.success("Profile image removed");
    } catch (error) {
      console.error("Failed to delete image:", error);
      toast.error("Failed to remove image from server");
    }
  }, [fileId, removeImage, onImageRemove]);

  useEffect(() => {
    return () => {
      if (preserveOnUnmount || isUploaded) return;
      if (fileId) {
        deleteImageFromImageKit(fileId).catch((err) => {
          console.warn("Failed to cleanup orphaned image:", err);
        });
      }
    };
  }, [preserveOnUnmount, isUploaded, fileId]);

  const displayUrl = previewUrl || url;
  const optimizedImageUrl = displayUrl
    ? getOptimizedImageUrl(displayUrl, {
        width: size === "sm" ? 64 : size === "md" ? 96 : 128,
        height: size === "sm" ? 64 : size === "md" ? 96 : 128,
        quality: 80,
        format: "auto",
      })
    : null;

  return (
    <div
      className={cn("relative flex flex-col items-center", sizeClasses[size])}
    >
      <div
        className={cn(
          "relative rounded-full border-2 border-dashed transition-all duration-200 overflow-hidden flex items-center justify-center",
          sizeClasses[size],
          {
            "border-primary bg-primary/5": isDragging,
            "border-muted-foreground/25 hover:border-primary/50":
              !isDragging && !disabled,
            "border-muted-foreground/10 cursor-not-allowed opacity-50":
              disabled,
            "cursor-pointer": !disabled,
          }
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        {optimizedImageUrl && (
          <Image
            src={optimizedImageUrl}
            alt="Profile"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
            priority={false}
          />
        )}

        {!optimizedImageUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <CameraIcon className={cn(iconSizes[size], "mb-1")} />
            {size !== "sm" && (
              <span className="text-xs text-center">
                {isDragging ? "Drop here" : "Add photo"}
              </span>
            )}
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
            <UploadCloudIcon
              className={cn(iconSizes[size], "mb-2 animate-pulse")}
            />
            {size !== "sm" && (
              <div className="w-3/4">
                <Progress value={uploadProgress} className="h-1" />
                <span className="text-xs mt-1 block text-center">
                  {uploadStatus || `${uploadProgress}%`}
                </span>
              </div>
            )}
          </div>
        )}

        {uploadProgress === 100 && (
          <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center text-white">
            <CheckIcon className={iconSizes[size]} />
          </div>
        )}
      </div>

      {displayUrl && !isUploading && !disabled && (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute -top-1 -right-1 w-6 h-6 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveImage();
          }}
        >
          <XIcon className="w-3 h-3" />
        </Button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { UploadIcon, LoaderIcon, XIcon, ImageIcon, FileImageIcon } from "lucide-react";
import { UploadButton } from "@/lib/uploadthing";
import { type OurFileRouter } from "@/lib/uploadthing";
import { Id } from "../../../../convex/_generated/dataModel";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ImageUploadDialogProps {
  projectId: Id<"projects">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageUploaded?: (url: string) => void;
}

export function ImageUploadDialog({
  projectId,
  open,
  onOpenChange,
  onImageUploaded,
}: ImageUploadDialogProps) {
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadComplete = (res: any[]) => {
    const urls = res.map((file) => file.url);
    setUploadedImages((prev) => [...prev, ...urls]);

    urls.forEach((url) => {
      toast.success("Image uploaded successfully!");
      onImageUploaded?.(url);
    });
  };

  const handleUploadError = (error: Error) => {
    toast.error(`Failed to upload image: ${error.message}`);
  };

  const handleRemoveImage = (url: string) => {
    setUploadedImages((prev) => prev.filter((img) => img !== url));
  };

  const handleClose = () => {
    setUploadedImages([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="size-5" />
            Upload Images
          </DialogTitle>
          <DialogDescription>
            Upload images to use in your project. Images are stored securely and
            can be referenced in your code.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Upload Image</Label>
            <div className="flex items-center gap-2">
              <UploadButton<OurFileRouter>
                endpoint="imageUploader"
                onClientUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                input={{ projectId: projectId.toString() }}
                appearance={{
                  button({ ready, isUploading }) {
                    return {
                      ...ready,
                      ...isUploading,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      padding: "0.5rem 1rem",
                      borderRadius: "0.375rem",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      backgroundColor: "hsl(var(--primary))",
                      color: "hsl(var(--primary-foreground))",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    };
                  },
                  container: {
                    display: "inline-block",
                  },
                  allowedContent: {
                    display: "none",
                  },
                }}
              />
              <p className="text-xs text-muted-foreground">
                Max 8MB per file, up to 10 images
              </p>
            </div>
          </div>

          {uploadedImages.length > 0 && (
            <div className="space-y-2">
              <Label>Uploaded Images</Label>
              <div className="grid grid-cols-2 gap-2">
                {uploadedImages.map((url, index) => (
                  <div
                    key={index}
                    className="relative group aspect-square rounded-lg overflow-hidden border"
                  >
                    <img
                      src={url}
                      alt={`Uploaded ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveImage(url)}
                    >
                      <XIcon className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadedImages.length > 0 && (
            <div className="space-y-2">
              <Label>Copy Image URL</Label>
              <div className="flex flex-wrap gap-2">
                {uploadedImages.map((url, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(url);
                      toast.success("URL copied to clipboard!");
                    }}
                    className="text-xs"
                  >
                    <FileImageIcon className="size-3 mr-1" />
                    Copy URL
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

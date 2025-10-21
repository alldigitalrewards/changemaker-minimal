'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Download, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BulkUploadDialogProps {
  onUpdate: () => void;
}

export function BulkUploadDialog({ onUpdate }: BulkUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ created: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setSuccess(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/users/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setSuccess(data);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onUpdate();
    } catch (error: any) {
      setError(error.message || 'Failed to upload file');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `email,workspaceSlug,role
user@example.com,acme,PARTICIPANT
admin@example.com,acme,ADMIN`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-upload-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Upload className="h-4 w-4 mr-2" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Upload Members</DialogTitle>
          <DialogDescription>
            Upload a CSV file to add multiple members at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template */}
          <div className="border-2 border-dashed rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-2">Step 1: Download Template</h3>
            <p className="text-sm text-gray-600 mb-3">
              Start with our CSV template to ensure correct formatting
            </p>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>
          </div>

          {/* Upload File */}
          <div className="border-2 border-dashed rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-2">Step 2: Upload Your CSV</h3>
            <p className="text-sm text-gray-600 mb-3">
              CSV should contain: email, workspaceSlug, role (ADMIN or PARTICIPANT)
            </p>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="flex-1 text-sm"
              />
              <Button
                onClick={handleUpload}
                disabled={!file || isLoading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold text-green-800">
                    Successfully created {success.created} member{success.created !== 1 ? 's' : ''}
                  </p>
                  {success.errors.length > 0 && (
                    <div>
                      <p className="text-sm text-yellow-800 font-medium mb-1">
                        {success.errors.length} error{success.errors.length !== 1 ? 's' : ''}:
                      </p>
                      <ul className="text-xs text-yellow-700 list-disc pl-4">
                        {success.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

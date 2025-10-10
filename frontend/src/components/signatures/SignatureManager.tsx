'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { UserSignatureResource, UserSignature, UserSignatureType } from '@/lib/resources';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Pencil,
  Upload,
  Type,
  Star,
  Trash2,
  Check,
  Download,
  PenTool,
  Eraser,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const FONT_OPTIONS = [
  { value: 'cursive', label: 'Cursive' },
  { value: 'serif', label: 'Serif' },
  { value: 'monospace', label: 'Monospace' },
  { value: 'Dancing Script', label: 'Dancing Script' },
  { value: 'Pacifico', label: 'Pacifico' },
];

export function SignatureManager() {
  const { t } = useTranslation('signatures');
  const { toast } = useToast();
  const [signatures, setSignatures] = useState<UserSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSignature, setSelectedSignature] = useState<UserSignature | null>(null);
  const [creationType, setCreationType] = useState<UserSignatureType>('drawn');

  // Form state
  const [signatureName, setSignatureName] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [typedText, setTypedText] = useState('');
  const [selectedFont, setSelectedFont] = useState('cursive');

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    loadSignatures();
  }, []);

  const loadSignatures = async () => {
    try {
      setLoading(true);
      const data = await UserSignatureResource.list();
      setSignatures(data);
    } catch (error: any) {
      toast({
        title: t('manager.loadError'),
        description: error.response?.data?.message || t('manager.actionFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('manager.invalidFile'),
        description: t('manager.invalidFileMessage'),
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: t('manager.fileTooLarge'),
        description: t('manager.fileTooLargeMessage'),
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  useEffect(() => {
    if (createDialogOpen && creationType === 'drawn') {
      initializeCanvas();
    }
  }, [createDialogOpen, creationType]);

  const handleCreate = async () => {
    if (!signatureName.trim()) {
      toast({
        title: t('manager.nameRequired'),
        description: t('manager.nameRequiredMessage'),
        variant: 'destructive',
      });
      return;
    }

    let signatureData = '';

    try {
      if (creationType === 'image') {
        if (!uploadedImage) {
          toast({
            title: t('manager.imageRequired'),
            description: t('manager.imageRequiredMessage'),
            variant: 'destructive',
          });
          return;
        }
        signatureData = uploadedImage;
      } else if (creationType === 'drawn') {
        const canvas = canvasRef.current;
        if (!canvas) return;
        signatureData = canvas.toDataURL('image/png');
      } else if (creationType === 'typed') {
        if (!typedText.trim()) {
          toast({
            title: t('manager.textRequired'),
            description: t('manager.textRequiredMessage'),
            variant: 'destructive',
          });
          return;
        }
        signatureData = typedText;
      }

      await UserSignatureResource.create({
        name: signatureName,
        type: creationType,
        data: signatureData,
        font: creationType === 'typed' ? selectedFont : undefined,
      });

      toast({
        title: t('manager.createSuccess'),
        description: t('manager.createSuccessMessage'),
      });

      // Reset form
      setSignatureName('');
      setUploadedImage(null);
      setTypedText('');
      setSelectedFont('cursive');
      setCreateDialogOpen(false);

      loadSignatures();
    } catch (error: any) {
      toast({
        title: t('manager.createError'),
        description: error.response?.data?.message || t('manager.actionFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleSetDefault = async (signature: UserSignature) => {
    try {
      await UserSignatureResource.update(signature.id, { isDefault: true });

      toast({
        title: t('manager.defaultSuccess'),
        description: t('manager.defaultSuccessMessage'),
      });

      loadSignatures();
    } catch (error: any) {
      toast({
        title: t('manager.defaultError'),
        description: error.response?.data?.message || t('manager.actionFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (signature: UserSignature) => {
    setSelectedSignature(signature);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSignature) return;

    try {
      await UserSignatureResource.delete(selectedSignature.id);

      toast({
        title: t('manager.deleteSuccess'),
        description: t('manager.deleteSuccessMessage'),
      });

      loadSignatures();
      setDeleteDialogOpen(false);
      setSelectedSignature(null);
    } catch (error: any) {
      toast({
        title: t('manager.deleteError'),
        description: error.response?.data?.message || t('manager.actionFailed'),
        variant: 'destructive',
      });
    }
  };

  const renderSignaturePreview = (signature: UserSignature) => {
    if (signature.type === 'image' || signature.type === 'drawn') {
      return (
        <img
          src={signature.data}
          alt={signature.name}
          className="h-16 object-contain bg-white border rounded p-2"
        />
      );
    } else if (signature.type === 'typed') {
      return (
        <div
          className="h-16 flex items-center justify-center bg-white border rounded p-2"
          style={{ fontFamily: signature.font || 'cursive', fontSize: '24px' }}
        >
          {signature.data}
        </div>
      );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('manager.title')}</CardTitle>
          <CardDescription>{t('manager.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('manager.title')}</CardTitle>
              <CardDescription>{t('manager.description')}</CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              {t('manager.create')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {signatures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <PenTool className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">{t('manager.noSignatures')}</p>
              <p className="text-sm text-muted-foreground mb-4">
                {t('manager.noSignaturesMessage')}
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                {t('manager.createFirst')}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {signatures.map((signature) => (
                <div
                  key={signature.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{signature.name}</h4>
                      {signature.isDefault && (
                        <Badge variant="default">
                          <Star className="h-3 w-3 mr-1" />
                          {t('manager.default')}
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline">{t(`manager.types.${signature.type}`)}</Badge>
                  </div>

                  <div className="flex justify-center">{renderSignaturePreview(signature)}</div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {t('manager.used', { count: signature.usageCount })}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {!signature.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleSetDefault(signature)}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        {t('manager.setDefault')}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteClick(signature)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Signature Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('manager.createTitle')}</DialogTitle>
            <DialogDescription>{t('manager.createDescription')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('manager.signatureName')}</Label>
              <Input
                id="name"
                placeholder={t('manager.signatureNamePlaceholder')}
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
              />
            </div>

            <Tabs value={creationType} onValueChange={(value) => setCreationType(value as UserSignatureType)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="drawn">
                  <Pencil className="h-4 w-4 mr-2" />
                  {t('manager.draw')}
                </TabsTrigger>
                <TabsTrigger value="image">
                  <Upload className="h-4 w-4 mr-2" />
                  {t('manager.upload')}
                </TabsTrigger>
                <TabsTrigger value="typed">
                  <Type className="h-4 w-4 mr-2" />
                  {t('manager.type')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="drawn" className="space-y-4">
                <div className="border rounded-lg p-4 bg-white">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={200}
                    className="border rounded cursor-crosshair w-full"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={clearCanvas}
                  >
                    <Eraser className="h-4 w-4 mr-2" />
                    {t('manager.clear')}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="image" className="space-y-4">
                <div className="border rounded-lg p-4 text-center">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="mb-4"
                  />
                  {uploadedImage && (
                    <div className="mt-4">
                      <img
                        src={uploadedImage}
                        alt="Preview"
                        className="max-h-48 mx-auto border rounded"
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="typed" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="text">{t('manager.signatureText')}</Label>
                  <Input
                    id="text"
                    placeholder={t('manager.signatureTextPlaceholder')}
                    value={typedText}
                    onChange={(e) => setTypedText(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="font">{t('manager.font')}</Label>
                  <Select value={selectedFont} onValueChange={setSelectedFont}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {typedText && (
                  <div className="border rounded-lg p-4 bg-white text-center">
                    <div
                      style={{ fontFamily: selectedFont, fontSize: '32px' }}
                    >
                      {typedText}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {t('manager.cancel')}
            </Button>
            <Button onClick={handleCreate}>
              <Check className="h-4 w-4 mr-2" />
              {t('manager.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('manager.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('manager.deleteConfirmMessage', { name: selectedSignature?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('manager.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              {t('manager.confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

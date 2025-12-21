import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, Loader2, Bike, ImagePlus, UploadCloud, Camera, RefreshCw, X, CheckCircle2, History, TrendingUp, ExternalLink } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

const MotorcycleRegistration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  
  // Session State (เก็บค่าชั่วคราวในหน้าจอขณะทำงาน)
  const [sessionCount, setSessionCount] = useState(0);
  const [recentHistory, setRecentHistory] = useState<any[]>([]);

  // Camera & Dialog States
  const [showCamera, setShowCamera] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'vehicle' | 'plate' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Form Data
  const initialForm = { name: '', class: '', brand: '', model: '', color: '', licensePlate: '' };
  const [formData, setFormData] = useState(initialForm);
  const [others, setOthers] = useState({ class: '', brand: '', color: '' });
  const [vehicleFile, setVehicleFile] = useState<File | null>(null);
  const [plateFile, setPlateFile] = useState<File | null>(null);

  // Options
  const CLASS_OPTIONS = ["ม.1/1", "ม.1/2", "ม.1/3", "ม.1/4", "ม.1/5", "ม.2/1", "ม.2/2", "ม.2/3", "ม.2/4", "ม.2/5", "ม.3/1", "ม.3/2", "ม.3/3", "ม.3/4", "ม.3/5", "ม.4/1", "ม.4/2", "ม.4/3", "ม.4/4", "ม.4/5", "ม.5/1", "ม.5/2", "ม.5/3", "ม.5/4", "ม.5/5", "ม.6/1", "ม.6/2", "ม.6/3", "ม.6/4", "ม.6/5", "ครู/บุคลากร", "others"];
  const BRAND_OPTIONS = ["Honda", "Yamaha", "Kawasaki", "Suzuki", "Vespa", "GPX", "Lambretta", "others"];
  const COLOR_OPTIONS = ["ดำ", "ขาว", "แดง", "น้ำเงิน", "เทา", "เขียว", "เหลือง", "ชมพู", "ส้ม", "ม่วง", "น้ำตาล", "others"];

  const handleInputChange = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));
  const handleOtherChange = (field: string, value: string) => setOthers(prev => ({ ...prev, [field]: value }));

  // --- Duplicate Check ---
  const checkDuplicatePlate = async (plate: string) => {
    const { data, error } = await supabase
      .from('motorcycles')
      .select('id')
      .eq('license_plate', plate)
      .maybeSingle();
    return !error && !!data;
  };

  // --- Camera Logic ---
  const startCamera = async (target: 'vehicle' | 'plate') => {
    setCameraTarget(target);
    setShowCamera(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: { exact: "environment" } } 
      }).catch(() => navigator.mediaDevices.getUserMedia({ video: true }));
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      toast({ title: "เปิดกล้องไม่ได้", description: "กรุณาใช้ปุ่ม 'เลือกจากอัลบั้ม' แทน", variant: "destructive" });
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    setStream(null);
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !cameraTarget) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `${cameraTarget}.jpg`, { type: 'image/jpeg' });
          if (cameraTarget === 'vehicle') setVehicleFile(file);
          else setPlateFile(file);
          stopCamera();
        }
      }, 'image/jpeg', 0.8);
    }
  };

  const compressAndUpload = async (file: File, prefix: string): Promise<string> => {
    const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: true, initialQuality: 0.7 };
    try {
      setUploadStatus(`อัปโหลดรูป ${prefix}...`);
      const compressedFile = await imageCompression(file, options);
      const fileName = `${Date.now()}_${prefix}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('motorcycle-photos').upload(fileName, compressedFile);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('motorcycle-photos').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) { throw new Error(`อัปโหลดรูปไม่สำเร็จ`); }
  };

  // --- Pre-Submit ---
  const handlePreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalClass = formData.class === 'others' ? others.class : formData.class;
    const finalBrand = formData.brand === 'others' ? others.brand : formData.brand;
    const finalColor = formData.color === 'others' ? others.color : formData.color;

    if (!formData.name || !finalClass || !finalBrand || !formData.model || !finalColor || !formData.licensePlate) {
      toast({ title: "ข้อมูลไม่ครบ", description: "กรุณากรอกข้อมูลให้ครบทุกช่อง", variant: "destructive" });
      return;
    }
    if (!vehicleFile || !plateFile) {
      toast({ title: "ขาดรูปถ่าย", description: "กรุณาถ่ายรูปให้ครบทั้ง 2 รูป", variant: "destructive" });
      return;
    }

    setLoading(true);
    setUploadStatus('ตรวจสอบทะเบียน...');
    const isDuplicate = await checkDuplicatePlate(formData.licensePlate);
    setLoading(false);
    setUploadStatus('');

    if (isDuplicate) {
      toast({ title: "ทะเบียนซ้ำ!", description: `ทะเบียน ${formData.licensePlate} มีในระบบแล้ว`, variant: "destructive" });
      return;
    }

    setShowConfirm(true);
  };

  // --- Real Submit ---
  const handleConfirmSubmit = async () => {
    setShowConfirm(false);
    setLoading(true);

    try {
      const finalClass = formData.class === 'others' ? others.class : formData.class;
      const finalBrand = formData.brand === 'others' ? others.brand : formData.brand;
      const finalColor = formData.color === 'others' ? others.color : formData.color;

      const [vehicleUrl, plateUrl] = await Promise.all([
        compressAndUpload(vehicleFile!, 'vehicle'),
        compressAndUpload(plateFile!, 'plate')
      ]);

      setUploadStatus('กำลังบันทึก...');
      const { error } = await supabase.from('motorcycles').insert([{
        owner_name: formData.name,
        classroom: finalClass,
        brand_model: `${finalBrand} ${formData.model}`,
        vehicle_color: finalColor,
        license_plate: formData.licensePlate,
        points: 100,
        vehicle_image_url: vehicleUrl,
        plate_image_url: plateUrl
      }]);

      if (error) throw error;

      // Update Session Data
      setSessionCount(prev => prev + 1);
      setRecentHistory(prev => [{
        plate: formData.licensePlate,
        name: formData.name,
        class: finalClass,
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      }, ...prev]);

      toast({ 
        title: "✅ บันทึกสำเร็จ!", 
        description: `เพิ่ม ${formData.licensePlate} เข้าระบบแล้ว`,
        className: "bg-green-600 text-white border-none"
      });
      
      // Reset Form
      setFormData(initialForm);
      setOthers({ class: '', brand: '', color: '' });
      setVehicleFile(null);
      setPlateFile(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error: any) {
      toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setUploadStatus('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 pb-32">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* Confirm Dialog */}
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent className="max-w-sm rounded-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center text-blue-600"><CheckCircle2 className="mr-2"/> ยืนยันข้อมูลถูกต้อง?</DialogTitle>
              <DialogDescription>กรุณาตรวจสอบข้อมูลก่อนบันทึก</DialogDescription>
            </DialogHeader>
            <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">ชื่อ:</span> <span className="font-bold">{formData.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">ทะเบียน:</span> <span className="font-bold text-blue-600">{formData.licensePlate}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">รถ:</span> <span>{formData.brand} {formData.model} ({formData.color})</span></div>
              <div className="flex gap-2 mt-2 pt-2 border-t justify-center">
                {vehicleFile && <img src={URL.createObjectURL(vehicleFile)} className="w-16 h-16 object-cover rounded border" />}
                {plateFile && <img src={URL.createObjectURL(plateFile)} className="w-16 h-16 object-cover rounded border" />}
              </div>
            </div>
            <DialogFooter className="flex-row gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowConfirm(false)}>แก้ไข</Button>
              <Button onClick={handleConfirmSubmit} className="bg-green-600 hover:bg-green-700">ยืนยันบันทึก</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Camera Modal */}
        <Dialog open={showCamera} onOpenChange={stopCamera}>
          <DialogContent className="max-w-md p-0 overflow-hidden bg-black border-none h-[100dvh] flex flex-col">
            <div className="relative flex-1 bg-black flex flex-col items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[80%] h-[50%] border-2 border-white/50 rounded-lg"></div>
              </div>
              <div className="absolute bottom-10 w-full flex items-center justify-around px-8">
                <Button onClick={stopCamera} variant="ghost" className="rounded-full h-12 w-12 bg-white/20 text-white"><X /></Button>
                <Button onClick={capturePhoto} className="rounded-full h-20 w-20 bg-white border-4 border-slate-300 shadow-2xl hover:scale-105 active:scale-95 transition-transform"></Button>
                <div className="w-12"></div>
              </div>
              <div className="absolute top-10 bg-black/60 text-white px-4 py-1 rounded-full text-sm">
                ถ่ายภาพ{cameraTarget === 'plate' ? 'ป้ายทะเบียน' : 'ตัวรถ'}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Header & Stats */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/home')} className="-ml-2"><ArrowLeft className="h-5 w-5 mr-1" /> หน้าแรก</Button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-500">รายการรอบนี้:</span>
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" /> {sessionCount}
            </span>
          </div>
        </div>

        {/* Main Form */}
        <Card className="border-none shadow-md">
          <CardHeader className="bg-slate-900 text-white py-3 px-4 rounded-t-lg flex flex-row items-center justify-between">
            <CardTitle className="text-md flex items-center"><Bike className="mr-2 h-4 w-4" /> ลงทะเบียนรถใหม่</CardTitle>
            <Button size="sm" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 h-8" onClick={() => setFormData(initialForm)}>
              <RefreshCw className="h-3 w-3 mr-1" /> ล้าง
            </Button>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={handlePreSubmit} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>ชื่อ-สกุล <span className="text-red-500">*</span></Label>
                  <Input placeholder="เช่น นายรักดี มีวินัย" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label>ระดับชั้น <span className="text-red-500">*</span></Label>
                  <select className="flex h-10 w-full rounded-md border bg-background px-3 mt-1" value={formData.class} onChange={(e) => handleInputChange('class', e.target.value)}>
                    <option value="" disabled>เลือกชั้น...</option>
                    {CLASS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  {formData.class === 'others' && <Input placeholder="ระบุชั้น..." className="mt-2" onChange={(e) => setOthers({...others, class: e.target.value})} />}
                </div>
              </div>

              <hr className="border-slate-100" />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>ยี่ห้อ</Label>
                  <select className="flex h-10 w-full rounded-md border bg-background px-3 mt-1" value={formData.brand} onChange={(e) => handleInputChange('brand', e.target.value)}>
                    <option value="" disabled>เลือก...</option>
                    {BRAND_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  {formData.brand === 'others' && <Input placeholder="ระบุ..." className="mt-2" onChange={(e) => setOthers({...others, brand: e.target.value})} />}
                </div>
                <div><Label>รุ่น</Label><Input placeholder="เช่น Wave" value={formData.model} onChange={(e) => handleInputChange('model', e.target.value)} className="mt-1" /></div>
                <div>
                  <Label>สี</Label>
                  <select className="flex h-10 w-full rounded-md border bg-background px-3 mt-1" value={formData.color} onChange={(e) => handleInputChange('color', e.target.value)}>
                    <option value="" disabled>เลือก...</option>
                    {COLOR_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  {formData.color === 'others' && <Input placeholder="ระบุ..." className="mt-2" onChange={(e) => setOthers({...others, color: e.target.value})} />}
                </div>
                <div>
                  <Label className="text-blue-600 font-bold">ทะเบียน <span className="text-red-500">*</span></Label>
                  <Input placeholder="1กข 1234" className="mt-1 font-mono text-lg tracking-wide border-blue-200 bg-blue-50" value={formData.licensePlate} onChange={(e) => handleInputChange('licensePlate', e.target.value)} />
                </div>
              </div>

              <hr className="border-slate-100" />

              <div className="grid grid-cols-2 gap-3">
                <div 
                  className={`border-2 border-dashed rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 ${vehicleFile ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:bg-slate-50'}`}
                  onClick={() => startCamera('vehicle')}
                >
                  {vehicleFile ? (
                    <div className="text-center">
                      <img src={URL.createObjectURL(vehicleFile)} className="h-16 w-16 object-cover rounded-md mx-auto mb-1 border" />
                      <span className="text-xs text-green-700 font-bold block">ถ่ายใหม่</span>
                    </div>
                  ) : (
                    <>
                      <Camera className="w-8 h-8 text-slate-400 mb-1"/>
                      <span className="text-xs text-slate-500">คน+รถ</span>
                    </>
                  )}
                </div>

                <div 
                  className={`border-2 border-dashed rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 ${plateFile ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:bg-slate-50'}`}
                  onClick={() => startCamera('plate')}
                >
                  {plateFile ? (
                    <div className="text-center">
                      <img src={URL.createObjectURL(plateFile)} className="h-16 w-16 object-cover rounded-md mx-auto mb-1 border" />
                      <span className="text-xs text-green-700 font-bold block">ถ่ายใหม่</span>
                    </div>
                  ) : (
                    <>
                      <ImagePlus className="w-8 h-8 text-slate-400 mb-1"/>
                      <span className="text-xs text-slate-500">ป้ายทะเบียน</span>
                    </>
                  )}
                </div>
              </div>

              <div className="fixed bottom-4 left-0 right-0 px-4 max-w-3xl mx-auto z-20">
                <Button type="submit" className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg shadow-xl rounded-xl" disabled={loading}>
                  {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {uploadStatus || 'กำลังตรวจสอบ...'}</> : <><Save className="mr-2 h-5 w-5" /> บันทึกข้อมูล</>}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* --- Recent History Section (ใหม่) --- */}
        {recentHistory.length > 0 && (
          <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
            <h3 className="text-sm font-semibold text-slate-500 mb-2 flex items-center px-1">
              <History className="w-4 h-4 mr-1" /> บันทึกล่าสุด ({recentHistory.length})
            </h3>
            <div className="space-y-2">
              {recentHistory.map((item, index) => (
                <div key={index} className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{item.plate}</div>
                    <div className="text-xs text-slate-500">{item.name} ({item.class})</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono text-slate-400">{item.time}</div>
                    <div className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full mt-1">สำเร็จ</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MotorcycleRegistration;
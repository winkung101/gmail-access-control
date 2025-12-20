import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, Loader2, Bike, ImagePlus, UploadCloud, Camera, RefreshCw, ScanText, X } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Tesseract from 'tesseract.js'; // พระเอกตัวจริง (OCR ฟรี)

const MotorcycleRegistration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  
  // Camera States
  const [showCamera, setShowCamera] = useState(false);
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

  // --- ระบบกล้อง ---
  const startCamera = async (target: 'vehicle' | 'plate') => {
    setCameraTarget(target);
    setShowCamera(true);
    try {
      // พยายามเปิดกล้องหลัง (environment)
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: { exact: "environment" } } 
      }).catch(() => {
        // ถ้าไม่มีกล้องหลัง ให้เปิดกล้องอะไรก็ได้ที่มี
        return navigator.mediaDevices.getUserMedia({ video: true });
      });
      
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      toast({ title: "ไม่สามารถเปิดกล้องได้", description: "กรุณาอนุญาตการเข้าถึงกล้อง หรือลองใช้บนมือถือ", variant: "destructive" });
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    setStream(null);
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !cameraTarget) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], `${cameraTarget}.jpg`, { type: 'image/jpeg' });
          
          if (cameraTarget === 'vehicle') setVehicleFile(file);
          else if (cameraTarget === 'plate') {
            setPlateFile(file);
            await performOCR(file); // เริ่มสแกนฟรี
          }
          stopCamera();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  // --- ระบบ OCR ฟรี (Tesseract.js) ---
  const performOCR = async (file: File) => {
    setUploadStatus("กำลังแกะตัวอักษร... (อาจใช้เวลาสักครู่)");
    
    try {
      // ใช้ Tesseract อ่านภาษาไทย (tha) และอังกฤษ (eng)
      const { data: { text } } = await Tesseract.recognize(
        file,
        'tha+eng', 
        { 
          logger: m => {
            if(m.status === 'recognizing text') {
              setUploadStatus(`กำลังอ่าน... ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );

      // กรองเอาเฉพาะตัวที่น่าจะเป็นทะเบียน (ภาษาไทย + ตัวเลข)
      // ตัดบรรทัดใหม่ และอักขระพิเศษออก
      const cleanText = text.replace(/[^ก-ฮ0-9\s]/g, '').replace(/\s+/g, ' ').trim();
      
      console.log("OCR Result:", cleanText);

      if (cleanText.length > 2) {
        setFormData(prev => ({ ...prev, licensePlate: cleanText }));
        toast({ title: "อ่านสำเร็จ!", description: `ข้อความที่พบ: ${cleanText}`, className: "bg-green-50 text-green-800" });
      } else {
        toast({ title: "อ่านไม่ชัดเจน", description: "กรุณาถ่ายใหม่ให้ชัดขึ้น หรือพิมพ์เอง", variant: "destructive" });
      }
    } catch (error) {
      console.error("OCR Error:", error);
      toast({ title: "เกิดข้อผิดพลาดในการอ่านภาพ", variant: "destructive" });
    } finally {
      setUploadStatus('');
    }
  };

  // ฟังก์ชันบีบอัดและอัปโหลด
  const compressAndUpload = async (file: File, prefix: string): Promise<string> => {
    const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true, initialQuality: 0.8 };
    try {
      setUploadStatus(`บีบอัดรูป ${prefix}...`);
      const compressedFile = await imageCompression(file, options);
      const fileName = `${Date.now()}_${prefix}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('motorcycle-photos').upload(fileName, compressedFile);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('motorcycle-photos').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) { throw new Error(`Upload Failed: ${prefix}`); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const finalClass = formData.class === 'others' ? others.class : formData.class;
      const finalBrand = formData.brand === 'others' ? others.brand : formData.brand;
      const finalColor = formData.color === 'others' ? others.color : formData.color;

      if (!formData.name || !finalClass || !finalBrand || !formData.model || !finalColor || !formData.licensePlate) {
        throw new Error("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      }
      if (!vehicleFile || !plateFile) throw new Error("กรุณาถ่ายรูปให้ครบทั้ง 2 รูป");

      const vehicleUrl = await compressAndUpload(vehicleFile, 'vehicle');
      const plateUrl = await compressAndUpload(plateFile, 'plate');

      setUploadStatus('กำลังบันทึกข้อมูล...');
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

      toast({ title: "บันทึกข้อมูลสำเร็จ! ✅", description: "พร้อมสำหรับคันต่อไป..." });
      
      // Reset Form (Continuous Mode)
      setFormData(initialForm);
      setOthers({ class: '', brand: '', color: '' });
      setVehicleFile(null);
      setPlateFile(null);
      window.scrollTo(0, 0);

    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setUploadStatus('');
    }
  };

  // ฟังก์ชันเลือกไฟล์แบบ Browse
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Camera Modal */}
        <Dialog open={showCamera} onOpenChange={stopCamera}>
          <DialogContent className="max-w-md p-0 overflow-hidden bg-black border-none h-[100dvh] flex flex-col">
            <div className="relative flex-1 bg-black flex flex-col items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              
              {/* Overlay Frame */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[80%] h-[40%] border-2 border-white/50 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white"></div>
                </div>
              </div>
              
              {/* Controls */}
              <div className="absolute bottom-8 w-full flex items-center justify-around px-8">
                <Button onClick={stopCamera} variant="ghost" className="rounded-full h-12 w-12 bg-white/20 text-white hover:bg-white/40"><X /></Button>
                <Button onClick={capturePhoto} className="rounded-full h-20 w-20 bg-white border-4 border-slate-300 shadow-2xl hover:scale-105 transition-transform"></Button>
                <div className="w-12"></div> {/* Spacer */}
              </div>
              
              <div className="absolute top-8 bg-black/50 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
                ถ่ายภาพ{cameraTarget === 'plate' ? 'ป้ายทะเบียน' : 'ตัวรถ'}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/home')}><ArrowLeft className="h-4 w-4 mr-2" /> กลับหน้าหลัก</Button>
          <h1 className="text-2xl font-bold text-slate-800">ลงทะเบียนรถ (Auto OCR)</h1>
        </div>

        <Card className="border-none shadow-lg">
          <CardHeader className="bg-slate-900 text-white rounded-t-lg flex flex-row items-center justify-between">
            <CardTitle className="flex items-center text-lg"><Bike className="mr-2 h-5 w-5" /> ข้อมูลลงทะเบียน</CardTitle>
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={() => setFormData(initialForm)}>
              <RefreshCw className="h-4 w-4 mr-1" /> รีเซ็ต
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* 1. ข้อมูลเจ้าของ */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b pb-2">1. ข้อมูลผู้ขับขี่</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ชื่อ-นามสกุล <span className="text-red-500">*</span></Label>
                    <Input placeholder="นายรักดี มีวินัย" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>ระดับชั้น <span className="text-red-500">*</span></Label>
                    <select className="flex h-10 w-full rounded-md border bg-background px-3" value={formData.class} onChange={(e) => handleInputChange('class', e.target.value)}>
                      <option value="" disabled>เลือกชั้นเรียน...</option>
                      {CLASS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    {formData.class === 'others' && <Input placeholder="ระบุชั้นเรียน..." className="mt-2" onChange={(e) => setOthers({...others, class: e.target.value})} />}
                  </div>
                </div>
              </div>

              {/* 2. ข้อมูลรถ & สแกน */}
              <div className="space-y-4 pt-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b pb-2">2. ข้อมูลรถจักรยานยนต์</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ยี่ห้อรถ</Label>
                    <select className="flex h-10 w-full rounded-md border bg-background px-3" value={formData.brand} onChange={(e) => handleInputChange('brand', e.target.value)}>
                      <option value="" disabled>เลือกยี่ห้อ...</option>
                      {BRAND_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    {formData.brand === 'others' && <Input placeholder="ระบุยี่ห้อ..." className="mt-2" onChange={(e) => setOthers({...others, brand: e.target.value})} />}
                  </div>
                  <div className="space-y-2"><Label>รุ่น</Label><Input placeholder="เช่น Wave 110i" value={formData.model} onChange={(e) => handleInputChange('model', e.target.value)} /></div>
                  <div className="space-y-2">
                    <Label>สีรถ</Label>
                    <select className="flex h-10 w-full rounded-md border bg-background px-3" value={formData.color} onChange={(e) => handleInputChange('color', e.target.value)}>
                      <option value="" disabled>เลือกสี...</option>
                      {COLOR_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    {formData.color === 'others' && <Input placeholder="ระบุสี..." className="mt-2" onChange={(e) => setOthers({...others, color: e.target.value})} />}
                  </div>
                  
                  {/* ช่องทะเบียน (มีปุ่มสแกน) */}
                  <div className="space-y-2">
                    <Label className="flex justify-between items-center">
                      <span>เลขทะเบียนรถ <span className="text-red-500">*</span></span>
                      {/* ปุ่มเปิดกล้อง OCR */}
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100"
                        onClick={() => startCamera('plate')}
                      >
                        <ScanText className="h-3 w-3 mr-1" /> สแกนป้าย
                      </Button>
                    </Label>
                    <Input 
                      placeholder="1กข 1234 ร้อยเอ็ด" 
                      className="font-mono bg-slate-50 border-slate-200" 
                      value={formData.licensePlate} 
                      onChange={(e) => handleInputChange('licensePlate', e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              {/* 3. ถ่ายรูป (เลือกได้ว่าจะเปิดกล้องหรืออัปโหลด) */}
              <div className="space-y-4 pt-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b pb-2">3. หลักฐานรูปถ่าย</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* รูปคู่รถ */}
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors relative h-48 flex flex-col items-center justify-center ${vehicleFile ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:bg-slate-50'}`}
                  >
                    {vehicleFile ? (
                      <>
                        <img src={URL.createObjectURL(vehicleFile)} className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-60" />
                        <div className="relative z-10 flex flex-col items-center">
                          <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold mb-2">เรียบร้อย</span>
                          <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); setVehicleFile(null); }}>ลบรูป</Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col gap-3 w-full">
                        <Button type="button" variant="outline" onClick={() => startCamera('vehicle')} className="w-full">
                          <Camera className="mr-2 h-4 w-4"/> เปิดกล้องถ่าย
                        </Button>
                        <div className="relative w-full">
                          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                          <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">หรือ</span></div>
                        </div>
                        <div className="relative w-full">
                          <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, setVehicleFile)} />
                          <Button type="button" variant="secondary" className="w-full pointer-events-none">
                            <UploadCloud className="mr-2 h-4 w-4"/> เลือกจากอัลบั้ม
                          </Button>
                        </div>
                      </div>
                    )}
                    {!vehicleFile && <span className="absolute top-2 left-2 text-[10px] text-slate-400">รูปคู่กับตัวรถ</span>}
                  </div>

                  {/* รูปทะเบียน (ถ้าสแกนแล้วจะมีไฟล์มาเลย) */}
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors relative h-48 flex flex-col items-center justify-center ${plateFile ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:bg-slate-50'}`}
                  >
                    {plateFile ? (
                      <>
                        <img src={URL.createObjectURL(plateFile)} className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-60" />
                        <div className="relative z-10 flex flex-col items-center">
                          <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold mb-2">เรียบร้อย</span>
                          <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); setPlateFile(null); }}>ลบรูป</Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col gap-3 w-full">
                        <Button type="button" variant="outline" onClick={() => startCamera('plate')} className="w-full">
                          <ScanText className="mr-2 h-4 w-4"/> เปิดกล้องสแกน
                        </Button>
                        <div className="relative w-full">
                          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                          <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">หรือ</span></div>
                        </div>
                        <div className="relative w-full">
                          <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, setPlateFile)} />
                          <Button type="button" variant="secondary" className="w-full pointer-events-none">
                            <UploadCloud className="mr-2 h-4 w-4"/> เลือกจากอัลบั้ม
                          </Button>
                        </div>
                      </div>
                    )}
                    {!plateFile && <span className="absolute top-2 left-2 text-[10px] text-slate-400">รูปป้ายทะเบียน</span>}
                  </div>

                </div>
              </div>

              {/* ปุ่มบันทึก */}
              <div className="pt-4 sticky bottom-4 z-20">
                <Button type="submit" className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg shadow-xl transition-all hover:-translate-y-1 rounded-xl" disabled={loading}>
                  {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {uploadStatus || 'กำลังบันทึก...'}</> : <><Save className="mr-2 h-5 w-5" /> บันทึกและทำรายการต่อ</>}
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MotorcycleRegistration;
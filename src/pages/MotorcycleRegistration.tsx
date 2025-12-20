import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, Loader2, Bike, ImagePlus, UploadCloud } from 'lucide-react';
import imageCompression from 'browser-image-compression'; // Import ตัวบีบอัด

const MotorcycleRegistration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(''); // แสดงสถานะการอัปโหลด

  // ข้อมูลฟอร์ม
  const [formData, setFormData] = useState({
    name: '', class: '', brand: '', model: '', color: '', licensePlate: ''
  });
  const [others, setOthers] = useState({ class: '', brand: '', color: '' });

  // ข้อมูลรูปภาพ (File Object)
  const [vehicleFile, setVehicleFile] = useState<File | null>(null);
  const [plateFile, setPlateFile] = useState<File | null>(null);

  // ตัวเลือก Dropdown
  const CLASS_OPTIONS = ["ม.1/1", "ม.1/2", "ม.1/3", "ม.1/4", "ม.1/5", "ม.2/1", "ม.2/2", "ม.2/3", "ม.2/4", "ม.2/5", "ม.3/1", "ม.3/2", "ม.3/3", "ม.3/4", "ม.3/5", "ม.4/1", "ม.4/2", "ม.4/3", "ม.4/4", "ม.4/5", "ม.5/1", "ม.5/2", "ม.5/3", "ม.5/4", "ม.5/5", "ม.6/1", "ม.6/2", "ม.6/3", "ม.6/4", "ม.6/5", "ครู/บุคลากร", "others"];
  const BRAND_OPTIONS = ["Honda", "Yamaha", "Kawasaki", "Suzuki", "Vespa", "GPX", "Lambretta", "others"];
  const COLOR_OPTIONS = ["ดำ", "ขาว", "แดง", "น้ำเงิน", "เทา", "เขียว", "เหลือง", "ชมพู", "ส้ม", "ม่วง", "น้ำตาล", "others"];

  const handleInputChange = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));
  const handleOtherChange = (field: string, value: string) => setOthers(prev => ({ ...prev, [field]: value }));

  // ฟังก์ชันจัดการเลือกไฟล์
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // ฟังก์ชันบีบอัดและอัปโหลด
  const compressAndUpload = async (file: File, prefix: string): Promise<string> => {
    // 1. ตั้งค่าการบีบอัด
    const options = {
      maxSizeMB: 1,          // ขนาดสูงสุด 1MB
      maxWidthOrHeight: 1920, // กว้างหรือสูงไม่เกิน 1920px
      useWebWorker: true,
      initialQuality: 0.8     // คุณภาพ 80%
    };

    try {
      setUploadStatus(`กำลังบีบอัดรูป ${prefix}...`);
      const compressedFile = await imageCompression(file, options);
      
      // 2. ตั้งชื่อไฟล์ใหม่ (timestamp_prefix_filename)
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${prefix}.${fileExt}`;
      const filePath = `${fileName}`;

      setUploadStatus(`กำลังอัปโหลดรูป ${prefix}...`);
      
      // 3. อัปโหลดลง Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('motorcycle-photos')
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      // 4. ขอ Public URL
      const { data } = supabase.storage
        .from('motorcycle-photos')
        .getPublicUrl(filePath);

      return data.publicUrl;

    } catch (error) {
      console.error(error);
      throw new Error(`ไม่สามารถอัปโหลดรูป ${prefix} ได้`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setUploadStatus('');

    try {
      // ตรวจสอบข้อมูลครบถ้วน
      const finalClass = formData.class === 'others' ? others.class : formData.class;
      const finalBrand = formData.brand === 'others' ? others.brand : formData.brand;
      const finalColor = formData.color === 'others' ? others.color : formData.color;

      if (!formData.name || !finalClass || !finalBrand || !formData.model || !finalColor || !formData.licensePlate) {
        throw new Error("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      }

      if (!vehicleFile || !plateFile) {
        throw new Error("กรุณาอัปโหลดรูปถ่ายทั้ง 2 รูป");
      }

      // --- เริ่มกระบวนการอัปโหลดรูป ---
      const vehicleUrl = await compressAndUpload(vehicleFile, 'vehicle');
      const plateUrl = await compressAndUpload(plateFile, 'plate');

      setUploadStatus('กำลังบันทึกข้อมูล...');

      // --- บันทึกลง Database ---
      const { error } = await supabase.from('motorcycles').insert([
        {
          owner_name: formData.name,
          classroom: finalClass,
          brand_model: `${finalBrand} ${formData.model}`,
          vehicle_color: finalColor,
          license_plate: formData.licensePlate,
          points: 100,
          vehicle_image_url: vehicleUrl,
          plate_image_url: plateUrl
        }
      ]);

      if (error) throw error;

      toast({ title: "ลงทะเบียนสำเร็จ", description: "ข้อมูลและรูปภาพถูกบันทึกเรียบร้อยแล้ว" });
      navigate('/home');

    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setUploadStatus('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/home')}><ArrowLeft className="h-4 w-4 mr-2" /> กลับหน้าหลัก</Button>
          <h1 className="text-2xl font-bold text-slate-800">ลงทะเบียนรถจักรยานยนต์</h1>
        </div>

        <Card className="border-none shadow-lg">
          <CardHeader className="bg-slate-900 text-white rounded-t-lg">
            <CardTitle className="flex items-center text-lg"><Bike className="mr-2 h-5 w-5" /> แบบฟอร์มลงทะเบียน</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* ข้อมูลผู้ขับขี่ */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b pb-2">1. ข้อมูลผู้ขับขี่</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ชื่อ-นามสกุล <span className="text-red-500">*</span></Label>
                    <Input placeholder="นายรักดี มีวินัย" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>ระดับชั้น <span className="text-red-500">*</span></Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.class} onChange={(e) => handleInputChange('class', e.target.value)}>
                      <option value="" disabled>เลือกชั้นเรียน...</option>
                      {CLASS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt === 'others' ? 'อื่นๆ (ระบุเอง)' : opt}</option>)}
                    </select>
                    {formData.class === 'others' && <Input placeholder="ระบุชั้นเรียน..." className="mt-2" value={others.class} onChange={(e) => handleOtherChange('class', e.target.value)} />}
                  </div>
                </div>
              </div>

              {/* ข้อมูลรถ */}
              <div className="space-y-4 pt-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b pb-2">2. ข้อมูลรถจักรยานยนต์</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ยี่ห้อรถ <span className="text-red-500">*</span></Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.brand} onChange={(e) => handleInputChange('brand', e.target.value)}>
                      <option value="" disabled>เลือกยี่ห้อ...</option>
                      {BRAND_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt === 'others' ? 'อื่นๆ (ระบุเอง)' : opt}</option>)}
                    </select>
                    {formData.brand === 'others' && <Input placeholder="ระบุยี่ห้อ..." className="mt-2" value={others.brand} onChange={(e) => handleOtherChange('brand', e.target.value)} />}
                  </div>
                  <div className="space-y-2">
                    <Label>รุ่น (Model) <span className="text-red-500">*</span></Label>
                    <Input placeholder="เช่น Wave 110i" value={formData.model} onChange={(e) => handleInputChange('model', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>สีรถ <span className="text-red-500">*</span></Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.color} onChange={(e) => handleInputChange('color', e.target.value)}>
                      <option value="" disabled>เลือกสี...</option>
                      {COLOR_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt === 'others' ? 'อื่นๆ (ระบุเอง)' : opt}</option>)}
                    </select>
                    {formData.color === 'others' && <Input placeholder="ระบุสี..." className="mt-2" value={others.color} onChange={(e) => handleOtherChange('color', e.target.value)} />}
                  </div>
                  <div className="space-y-2">
                    <Label>เลขทะเบียนรถ <span className="text-red-500">*</span></Label>
                    <Input placeholder="เช่น 1กข 1234 ร้อยเอ็ด" className="font-mono" value={formData.licensePlate} onChange={(e) => handleInputChange('licensePlate', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* อัปโหลดรูปภาพ */}
              <div className="space-y-4 pt-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b pb-2">3. หลักฐานรูปถ่าย</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* รูปคนคู่รถ */}
                  <div className="space-y-2">
                    <Label className="flex items-center"><ImagePlus className="w-4 h-4 mr-2 text-blue-600"/> รูปถ่ายคู่กับตัวรถ (เห็นหน้า+รถ) <span className="text-red-500">*</span></Label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 hover:bg-slate-50 transition-colors text-center cursor-pointer relative">
                      <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, setVehicleFile)} />
                      {vehicleFile ? (
                        <div className="text-sm text-green-600 font-medium break-words">{vehicleFile.name}</div>
                      ) : (
                        <div className="text-slate-400 text-sm"><UploadCloud className="w-8 h-8 mx-auto mb-2 opacity-50"/>คลิกเพื่อเลือกรูปภาพ</div>
                      )}
                    </div>
                  </div>

                  {/* รูปทะเบียน */}
                  <div className="space-y-2">
                    <Label className="flex items-center"><ImagePlus className="w-4 h-4 mr-2 text-blue-600"/> รูปถ่ายคู่กับป้ายทะเบียน (เห็นชัดเจน) <span className="text-red-500">*</span></Label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 hover:bg-slate-50 transition-colors text-center cursor-pointer relative">
                      <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, setPlateFile)} />
                      {plateFile ? (
                        <div className="text-sm text-green-600 font-medium break-words">{plateFile.name}</div>
                      ) : (
                        <div className="text-slate-400 text-sm"><UploadCloud className="w-8 h-8 mx-auto mb-2 opacity-50"/>คลิกเพื่อเลือกรูปภาพ</div>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-orange-500 bg-orange-50 p-2 rounded">
                  * ระบบจะทำการบีบอัดรูปภาพอัตโนมัติ (ขนาดไม่เกิน 1MB) เพื่อความรวดเร็วในการส่งข้อมูล
                </p>
              </div>

              {/* ปุ่มบันทึก */}
              <div className="pt-4">
                <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-lg shadow-md transition-all hover:-translate-y-1" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {uploadStatus || 'กำลังประมวลผล...'}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" /> ยืนยันการลงทะเบียน
                    </>
                  )}
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
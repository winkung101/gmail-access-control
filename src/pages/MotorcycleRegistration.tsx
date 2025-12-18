import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, Loader2, Bike } from 'lucide-react';

const MotorcycleRegistration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // ข้อมูลในฟอร์ม
  const [formData, setFormData] = useState({
    name: '',
    class: '',
    brand: '',
    model: '',
    color: '',
    licensePlate: ''
  });

  // ข้อมูลสำหรับช่อง "อื่นๆ" (เมื่อเลือก Dropdown เป็น others)
  const [others, setOthers] = useState({
    class: '',
    brand: '',
    color: ''
  });

  // ตัวเลือกต่างๆ
  const CLASS_OPTIONS = [
    "ม.1/1", "ม.1/2", "ม.1/3", "ม.1/4", "ม.1/5",
    "ม.2/1", "ม.2/2", "ม.2/3", "ม.2/4", "ม.2/5",
    "ม.3/1", "ม.3/2", "ม.3/3", "ม.3/4", "ม.3/5",
    "ม.4/1", "ม.4/2", "ม.4/3", "ม.4/4", "ม.4/5",
    "ม.5/1", "ม.5/2", "ม.5/3", "ม.5/4", "ม.5/5",
    "ม.6/1", "ม.6/2", "ม.6/3", "ม.6/4", "ม.6/5",
    "ครู/บุคลากร",
    "others" // ตัวเลือกอื่นๆ
  ];

  const BRAND_OPTIONS = [
    "Honda", "Yamaha", "Kawasaki", "Suzuki", "Vespa", "GPX", "Lambretta", "others"
  ];

  const COLOR_OPTIONS = [
    "ดำ", "ขาว", "แดง", "น้ำเงิน", "เทา", "เขียว", "เหลือง", "ชมพู", "ส้ม", "ม่วง", "น้ำตาล", "others"
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOtherChange = (field: string, value: string) => {
    setOthers(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. เตรียมข้อมูลจริง (เช็คว่าเลือก Dropdown หรือพิมพ์เอง)
      const finalClass = formData.class === 'others' ? others.class : formData.class;
      const finalBrand = formData.brand === 'others' ? others.brand : formData.brand;
      const finalColor = formData.color === 'others' ? others.color : formData.color;

      // ตรวจสอบข้อมูลว่าง
      if (!formData.name || !finalClass || !finalBrand || !formData.model || !finalColor || !formData.licensePlate) {
        throw new Error("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      }

      // 2. บันทึกลง Supabase
      const { error } = await supabase.from('motorcycles').insert([
        {
          owner_name: formData.name,
          classroom: finalClass,
          brand_model: `${finalBrand} ${formData.model}`, // รวมยี่ห้อและรุ่น
          vehicle_color: finalColor,
          license_plate: formData.licensePlate,
          points: 100 // คะแนนเริ่มต้น
        }
      ]);

      if (error) throw error;

      toast({
        title: "ลงทะเบียนสำเร็จ",
        description: "ข้อมูลรถจักรยานยนต์ถูกบันทึกเรียบร้อยแล้ว",
      });

      // รีเซ็ตฟอร์ม หรือ กลับหน้าหลัก
      navigate('/home');

    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/home')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> กลับหน้าหลัก
          </Button>
          <h1 className="text-2xl font-bold text-slate-800">ลงทะเบียนรถจักรยานยนต์</h1>
        </div>

        <Card className="border-none shadow-lg">
          <CardHeader className="bg-slate-900 text-white rounded-t-lg">
            <CardTitle className="flex items-center text-lg">
              <Bike className="mr-2 h-5 w-5" /> แบบฟอร์มลงทะเบียน 
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* ส่วนที่ 1: ข้อมูลเจ้าของ */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b pb-2">ข้อมูลผู้ขับขี่</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">ชื่อ-นามสกุล <span className="text-red-500">*</span></Label>
                    <Input 
                      id="name" 
                      placeholder="นายรักดี มีวินัย" 
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="class">ระดับชั้น <span className="text-red-500">*</span></Label>
                    <select 
                      id="class"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData.class}
                      onChange={(e) => handleInputChange('class', e.target.value)}
                    >
                      <option value="" disabled>เลือกชั้นเรียน...</option>
                      {CLASS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt === 'others' ? 'อื่นๆ (ระบุเอง)' : opt}</option>
                      ))}
                    </select>
                    {formData.class === 'others' && (
                      <Input 
                        placeholder="ระบุชั้นเรียน..." 
                        className="mt-2 animate-in fade-in slide-in-from-top-1"
                        value={others.class}
                        onChange={(e) => handleOtherChange('class', e.target.value)}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* ส่วนที่ 2: ข้อมูลรถ */}
              <div className="space-y-4 pt-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b pb-2">ข้อมูลรถจักรยานยนต์</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ยี่ห้อ */}
                  <div className="space-y-2">
                    <Label htmlFor="brand">ยี่ห้อรถ <span className="text-red-500">*</span></Label>
                    <select 
                      id="brand"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      value={formData.brand}
                      onChange={(e) => handleInputChange('brand', e.target.value)}
                    >
                      <option value="" disabled>เลือกยี่ห้อ...</option>
                      {BRAND_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt === 'others' ? 'อื่นๆ (ระบุเอง)' : opt}</option>
                      ))}
                    </select>
                    {formData.brand === 'others' && (
                      <Input 
                        placeholder="ระบุยี่ห้อ..." 
                        className="mt-2"
                        value={others.brand}
                        onChange={(e) => handleOtherChange('brand', e.target.value)}
                      />
                    )}
                  </div>

                  {/* รุ่น */}
                  <div className="space-y-2">
                    <Label htmlFor="model">รุ่น (Model) <span className="text-red-500">*</span></Label>
                    <Input 
                      id="model" 
                      placeholder="เช่น Wave 110i, PCX, Scoopy i" 
                      value={formData.model}
                      onChange={(e) => handleInputChange('model', e.target.value)}
                    />
                  </div>

                  {/* สีรถ */}
                  <div className="space-y-2">
                    <Label htmlFor="color">สีรถ <span className="text-red-500">*</span></Label>
                    <select 
                      id="color"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      value={formData.color}
                      onChange={(e) => handleInputChange('color', e.target.value)}
                    >
                      <option value="" disabled>เลือกสี...</option>
                      {COLOR_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt === 'others' ? 'อื่นๆ (ระบุเอง)' : opt}</option>
                      ))}
                    </select>
                    {formData.color === 'others' && (
                      <Input 
                        placeholder="ระบุสี..." 
                        className="mt-2"
                        value={others.color}
                        onChange={(e) => handleOtherChange('color', e.target.value)}
                      />
                    )}
                  </div>

                  {/* ทะเบียนรถ */}
                  <div className="space-y-2">
                    <Label htmlFor="licensePlate">เลขทะเบียนรถ <span className="text-red-500">*</span></Label>
                    <Input 
                      id="licensePlate" 
                      placeholder="เช่น 1กข 1234 ร้อยเอ็ด" 
                      className="font-mono"
                      value={formData.licensePlate}
                      onChange={(e) => handleInputChange('licensePlate', e.target.value)}
                    />
                    <p className="text-[10px] text-slate-400">กรอกให้ครบทั้งหมวดอักษรและจังหวัด</p>
                  </div>
                </div>
              </div>

              {/* ปุ่มบันทึก */}
              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-lg shadow-md transition-all hover:-translate-y-1"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> กำลังบันทึกข้อมูล...
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
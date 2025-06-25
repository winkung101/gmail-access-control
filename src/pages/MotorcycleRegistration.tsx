
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MotorcycleRegistration = () => {
  const navigate = useNavigate();

  const handleExternalLink = () => {
    window.open('https://forms.gle/Gjwq7MXTvLtv8WZR7', '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate('/home')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับ
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">ลงทะเบียนรถจักรยานยนต์</h1>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ExternalLink className="h-5 w-5 mr-2" />
                แบบฟอร์มลงทะเบียนรถจักรยานยนต์
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                กรุณากรอกข้อมูลลงทะเบียนรถจักรยานยนต์ของคุณผ่านแบบฟอร์มออนไลน์
              </p>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">ข้อมูลที่ต้องเตรียม:</h3>
                <ul className="text-blue-800 space-y-1">
                  <li>• ชื่อ-สกุล</li>
                  <li>• ชั้น</li>
                  <li>• ข้อมูลรถจักรยานยนต์ (ยี่ห้อ, รุ่น, สี, ทะเบียน)</li>
                  <li>• รูปถ่ายคู่กับรถด้านหน้า</li>
                  <li>• รูปถ่ายคู่กับทะเบียนรถ</li>
                </ul>
              </div>
              <Button 
                onClick={handleExternalLink}
                className="w-full"
                size="lg"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                เปิดแบบฟอร์มลงทะเบียน
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>คำแนะนำ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-gray-600">
                <p>• กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนส่งแบบฟอร์ม</p>
                <p>• หลังจากลงทะเบียนแล้ว คุณจะได้รับหมายเลขอ้างอิงสำหรับติดตามสถานะ</p>
                <p>• หากมีปัญหาหรือข้อสงสัย กรุณาติดต่อเจ้าหน้าที่</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MotorcycleRegistration;

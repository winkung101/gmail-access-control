
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const MotorcycleSearch = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "กรุณาใส่ข้อมูลที่ต้องการค้นหา",
        description: "กรุณาใส่หมายเลขทะเบียน เลขเครื่อง หรือเลขถัง",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    
    // Simulate API call
    setTimeout(() => {
      // Mock search results
      const mockResults = [
        {
          id: 1,
          plateNumber: "1กข-1234",
          brand: "Honda",
          model: "Wave 125i",
          engineNumber: "JF56E-1234567",
          chassisNumber: "JF56E-1234567",
          ownerName: "นายสมชาย ใจดี",
          registrationDate: "2023-01-15",
          status: "ใช้งาน"
        }
      ];

      if (searchQuery.toLowerCase().includes('1กข') || 
          searchQuery.includes('1234567') || 
          searchQuery.toLowerCase().includes('wave')) {
        setSearchResults(mockResults);
      } else {
        setSearchResults([]);
      }
      
      setIsSearching(false);
    }, 1500);
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
          <h1 className="text-3xl font-bold text-gray-900">ระบบสืบค้นทะเบียนรถจักรยานยนต์</h1>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="h-5 w-5 mr-2" />
                ค้นหาข้อมูลทะเบียน
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  ค้นหาด้วย: หมายเลขทะเบียน, เลขเครื่อง, หรือเลขถัง
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="เช่น 1กข-1234 หรือ JF56E-1234567"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={isSearching}>
                    {isSearching ? (
                      <>กำลังค้นหา...</>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        ค้นหา
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold text-yellow-900 mb-2">วิธีการค้นหา:</h3>
                <ul className="text-yellow-800 space-y-1 text-sm">
                  <li>• ใส่หมายเลขทะเบียน เช่น "1กข-1234"</li>
                  <li>• ใส่เลขเครื่องยนต์ เช่น "JF56E-1234567"</li>
                  <li>• ใส่เลขถัง เช่น "JF56E-1234567"</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {searchResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  ผลการค้นหา
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {searchResults.map((result) => (
                    <div key={result.id} className="border rounded-lg p-4 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p><strong>หมายเลขทะเบียน:</strong> {result.plateNumber}</p>
                          <p><strong>ยี่ห้อ:</strong> {result.brand}</p>
                          <p><strong>รุ่น:</strong> {result.model}</p>
                          <p><strong>เลขเครื่อง:</strong> {result.engineNumber}</p>
                        </div>
                        <div className="space-y-2">
                          <p><strong>เลขถัง:</strong> {result.chassisNumber}</p>
                          <p><strong>ชื่อเจ้าของ:</strong> {result.ownerName}</p>
                          <p><strong>วันที่จดทะเบียน:</strong> {result.registrationDate}</p>
                          <p><strong>สถานะ:</strong> 
                            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                              {result.status}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {searchResults.length === 0 && searchQuery && !isSearching && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">ไม่พบข้อมูลที่ค้นหา</p>
                <p className="text-sm text-gray-400 mt-2">
                  กรุณาตรวจสอบข้อมูลและลองค้นหาใหม่อีกครั้ง
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MotorcycleSearch;

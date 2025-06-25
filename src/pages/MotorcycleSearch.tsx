// /workspaces/gmail-access-control/src/pages/MotorcycleSearch.tsx
import { useState, useEffect } from 'react';
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

  // --- START Google Sheet Integration ---
  // ใช้ Sheet ID จาก URL ที่คุณให้มา
  const GOOGLE_SHEET_ID = '1YqjDZXFLktWvwKg_2hY_kMGAhD69tmy6W4phpSfAMbM';
  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY; // ดึงจาก .env file
  
  // ปรับปรุงช่วงข้อมูล (Range) ให้ครอบคลุมคอลัมน์ที่เพิ่มเข้ามา
  // สมมติว่าข้อมูลของคุณอยู่ในชีตชื่อ "Sheet1" และครอบคลุมถึงคอลัมน์ H
  // คุณอาจต้องปรับ "Sheet1" และ "H" ให้ตรงกับชีตของคุณจริงๆ
  const GOOGLE_SHEET_RANGE = 'Sheet1!A:H'; 

  useEffect(() => {
    if (!GOOGLE_API_KEY) {
      toast({
        title: "Configuration Error",
        description: "Google API Key is missing. Please check your .env file and ensure VITE_GOOGLE_API_KEY is set.",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [GOOGLE_API_KEY]);

  const fetchGoogleSheetData = async () => {
    if (!GOOGLE_SHEET_ID || !GOOGLE_API_KEY) {
      console.error("Google Sheet ID or API Key is not configured.");
      return [];
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${GOOGLE_SHEET_RANGE}?key=${GOOGLE_API_KEY}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Sheets API error: ${response.statusText}`);
      }
      const data = await response.json();
      
      // Assuming the first row is headers
      const rawHeaders = data.values[0];
      const rows = data.values.slice(1);

      return rows.map((row: string[]) => {
        let rowData: { [key: string]: string } = {};
        rawHeaders.forEach((header: string, index: number) => {
          // Clean up and camelCase header names for easier access
          let key = '';
          switch (header.trim()) {
            case 'ประทับเวลา':
              key = 'timestamp';
              break;
            case 'ชื่อ - สกุล':
              key = 'fullName';
              break;
            case 'ชั้น':
              key = 'classGrade';
              break;
            case 'ยี่ห้อรุ่น':
              key = 'brandModel';
              break;
            case 'สีของรถ':
              key = 'vehicleColor';
              break;
            case 'ทะเบียนรถ':
              key = 'plateNumber';
              break;
            case 'รูปถ่ายคู่กับรถด้านหน้า':
              key = 'frontPhotoUrl';
              break;
            case 'รูปถ่ายคู่กับทะเบียนรถ':
              key = 'licensePlatePhotoUrl';
              break;
            default:
              // Fallback for other headers if any
              key = header.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
              key = key.charAt(0).toLowerCase() + key.slice(1);
              break;
          }
          rowData[key] = row[index] || '';
        });
        return rowData;
      });
    } catch (error) {
      console.error('Error fetching data from Google Sheet:', error);
      toast({
        title: "ข้อผิดพลาดในการดึงข้อมูล",
        description: "ไม่สามารถดึงข้อมูลจาก Google Sheet ได้ โปรดตรวจสอบ API Key และสิทธิ์การเข้าถึงชีต",
        variant: "destructive",
      });
      return [];
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "กรุณาใส่ข้อมูลที่ต้องการค้นหา",
        description: "กรุณาใส่ข้อมูลที่เกี่ยวข้องกับรถจักรยานยนต์ที่คุณต้องการค้นหา",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setSearchResults([]); // Clear previous results

    try {
      const allMotorcycles = await fetchGoogleSheetData();
      const lowerCaseQuery = searchQuery.toLowerCase();

      const filteredResults = allMotorcycles.filter(motorcycle =>
        (motorcycle.plateNumber && motorcycle.plateNumber.toLowerCase().includes(lowerCaseQuery)) ||
        (motorcycle.brandModel && motorcycle.brandModel.toLowerCase().includes(lowerCaseQuery)) ||
        (motorcycle.fullName && motorcycle.fullName.toLowerCase().includes(lowerCaseQuery)) ||
        (motorcycle.vehicleColor && motorcycle.vehicleColor.toLowerCase().includes(lowerCaseQuery))
        // สามารถเพิ่มฟิลด์อื่นๆ ที่คุณต้องการให้ค้นหาได้ที่นี่
      );
      setSearchResults(filteredResults);

      if (filteredResults.length === 0) {
        toast({
          title: "ไม่พบข้อมูล",
          description: "ไม่พบรถจักรยานยนต์ที่ตรงกับคำค้นหาของคุณ",
        });
      }

    } catch (error) {
      console.error("Search failed:", error);
      toast({
        title: "ข้อผิดพลาด",
        description: "เกิดข้อผิดพลาดขณะค้นหาข้อมูล",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };
  // --- END Google Sheet Integration ---

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
                  ค้นหาด้วย: ชื่อ-สกุล, หมายเลขทะเบียน, ยี่ห้อรุ่น, หรือสีของรถ
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="เช่น สมชาย, 1กข-1234, Wave110i, แดง"
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
                  <li>• ใส่ชื่อ-สกุล เช่น "สมชาย ใจดี"</li>
                  <li>• ใส่หมายเลขทะเบียน เช่น "1กข-1234"</li>
                  <li>• ใส่ยี่ห้อรุ่น เช่น "Wave110i"</li>
                  <li>• ใส่สีของรถ เช่น "สีแดง"</li>
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
                  {searchResults.map((result, index) => (
                    <div key={result.plateNumber + index} className="border rounded-lg p-4 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p><strong>ประทับเวลา:</strong> {result.timestamp}</p>
                          <p><strong>ชื่อ-สกุล:</strong> {result.fullName}</p>
                          <p><strong>ชั้น:</strong> {result.classGrade}</p>
                          <p><strong>ยี่ห้อรุ่น:</strong> {result.brandModel}</p>
                          <p><strong>สีของรถ:</strong> {result.vehicleColor}</p>
                          <p><strong>ทะเบียนรถ:</strong> {result.plateNumber}</p>
                        </div>
                        <div className="space-y-2">
                          {result.frontPhotoUrl && (
                            <div>
                              <p><strong>รูปถ่ายคู่กับรถด้านหน้า:</strong></p>
                              <img src={result.frontPhotoUrl} alt="รูปคู่กับรถด้านหน้า" className="w-full h-auto max-h-48 object-contain rounded-md mt-2" />
                            </div>
                          )}
                          {result.licensePlatePhotoUrl && (
                            <div>
                              <p><strong>รูปถ่ายคู่กับทะเบียนรถ:</strong></p>
                              <img src={result.licensePlatePhotoUrl} alt="รูปทะเบียนรถ" className="w-full h-auto max-h-48 object-contain rounded-md mt-2" />
                            </div>
                          )}
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
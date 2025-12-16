// src/pages/MotorcycleSearch.tsx
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, ArrowLeft, FileText, Loader2, AlertCircle, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';

const convertGoogleDriveLink = (originalUrl: string): string => {
  const match = originalUrl.match(/\/file\/d\/([^/]+)\//);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  return originalUrl;
};

const MotorcycleSearch = () => {
  const navigate = useNavigate();
  const { user, hasRole, loading: authLoading } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [allMotorcyclesData, setAllMotorcyclesData] = useState<any[]>([]);

  const GOOGLE_SHEET_ID = '1YqjDZXFLktWvwKg_2hY_kMGAhD69tmy6W4phpSfAMbM';
  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
  const GOOGLE_SHEET_RANGE = 'DATA!A:I';

  const canAccess = hasRole('super_admin') || hasRole('admin');

  const fetchGoogleSheetData = useCallback(async () => {
    if (!GOOGLE_SHEET_ID || !GOOGLE_API_KEY) {
      const errorMessage = "Google Sheet ID or API Key is not configured.";
      setInitialLoadError(errorMessage);
      return [];
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${GOOGLE_SHEET_RANGE}?key=${GOOGLE_API_KEY}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        let errorDetail = await response.text();
        try {
          const errorJson = JSON.parse(errorDetail);
          errorDetail = errorJson.error.message || errorDetail;
        } catch {}

        if (response.status === 400 && errorDetail.includes("Unable to parse range")) {
          throw new Error(`Google Sheets API Error (400): ไม่สามารถอ่านข้อมูลได้`);
        } else if (response.status === 403) {
          throw new Error(`Google Sheets API Error (403): การเข้าถึงถูกปฏิเสธ`);
        } else if (response.status === 429) {
          throw new Error(`Google Sheets API Error (429): โควต้าเกิน`);
        }

        throw new Error(`Google Sheets API Error (${response.status}): ${errorDetail}`);
      }

      const data = await response.json();
      if (!data.values || data.values.length <= 1) {
        setInitialLoadError("Google Sheet is empty or no data found.");
        return [];
      }

      const rawHeaders = data.values[0];
      const rows = data.values.slice(1);

      return rows.map((row: string[]) => {
        let rowData: { [key: string]: string } = {};
        rawHeaders.forEach((header: string, index: number) => {
          let key = '';
          switch (header.trim()) {
            case 'ประทับเวลา': key = 'timestamp'; break;
            case 'ชื่อ - สกุล': key = 'fullName'; break;
            case 'ชั้น (Ex. 1/1)': key = 'classGrade'; break;
            case 'ยี้ห้อ': key = 'brandModel'; break;
            case 'สีของรถ (เช่น สีแดง)': key = 'vehicleColor'; break;
            case 'ทะเบียนรถ ( 1ขข 1234 ร้อยเอ็ด)': key = 'plateNumber'; break;
            case 'รูปถ่ายคู่กับรถด้านหน้า': key = 'frontPhotoUrl'; break;
            case 'รูปถ่ายคู่กับทะเบียนรถ': key = 'licensePlatePhotoUrl'; break;
            default:
              key = header.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
              key = key.charAt(0).toLowerCase() + key.slice(1);
              break;
          }

          const value = row[index] || '';
          rowData[key] = (key === 'frontPhotoUrl' || key === 'licensePlatePhotoUrl')
            ? convertGoogleDriveLink(value)
            : value;
        });
        return rowData;
      });
    } catch (error: any) {
      setInitialLoadError(error.message);
      toast({
        title: "ข้อผิดพลาดในการดึงข้อมูล",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }
  }, [GOOGLE_SHEET_ID, GOOGLE_API_KEY, GOOGLE_SHEET_RANGE]);

  useEffect(() => {
    if (!authLoading) {
      const loadData = async () => {
        if (canAccess && allMotorcyclesData.length === 0 && !initialLoadError) {
          setIsInitialLoading(true);
          setInitialLoadError(null);
          const data = await fetchGoogleSheetData();
          setAllMotorcyclesData(data);
          setSearchResults(data);
          setIsInitialLoading(false);
        } else if (canAccess && allMotorcyclesData.length > 0 && isInitialLoading) {
          setIsInitialLoading(false);
        } else if (!canAccess && user) {
          setIsInitialLoading(false);
          setInitialLoadError("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
        } else if (!user) {
          navigate('/auth');
        }
      };
      loadData();
    }
  }, [authLoading, canAccess, user, navigate, fetchGoogleSheetData, allMotorcyclesData.length, initialLoadError, isInitialLoading]);

  const handleSearch = async () => {
    if (!canAccess) {
      toast({
        title: "ไม่ได้รับอนุญาต",
        description: "คุณไม่มีสิทธิ์ค้นหาข้อมูล",
        variant: "destructive",
      });
      return;
    }

    if (!searchQuery.trim()) {
      setSearchResults(allMotorcyclesData);
      toast({
        title: "แสดงข้อมูลทั้งหมด",
        description: "ไม่มีคำค้นหา ระบบแสดงข้อมูลทั้งหมด",
      });
      return;
    }

    if (initialLoadError) {
      toast({
        title: "ไม่สามารถค้นหาได้",
        description: "ไม่สามารถโหลดข้อมูลจาก Google Sheet ได้",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const filteredResults = allMotorcyclesData.filter(m =>
        (m.plateNumber && m.plateNumber.toLowerCase().includes(lowerCaseQuery)) ||
        (m.brandModel && m.brandModel.toLowerCase().includes(lowerCaseQuery)) ||
        (m.fullName && m.fullName.toLowerCase().includes(lowerCaseQuery)) ||
        (m.vehicleColor && m.vehicleColor.toLowerCase().includes(lowerCaseQuery))
      );
      setSearchResults(filteredResults);

      if (filteredResults.length === 0) {
        toast({
          title: "ไม่พบข้อมูล",
          description: "ไม่พบข้อมูลที่ตรงกับคำค้นหานี้",
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">กำลังตรวจสอบสิทธิ์ผู้ใช้...</p>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>ไม่ได้รับอนุญาต!</AlertTitle>
            <AlertDescription>
              คุณไม่มีสิทธิ์เข้าถึงหน้านี้ <br />
              เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถดูข้อมูลได้
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/home')}>กลับสู่หน้าหลัก</Button>
        </div>
      </div>
    );
  }

  // ส่วนแสดงผลหลักสำหรับผู้ใช้ที่มีสิทธิ์
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

        {/* สถานะการเชื่อมต่อ Google Sheet แสดงอยู่ตลอด */}
        {isInitialLoading && (
          <Alert className="mb-4 bg-blue-100 text-blue-900 border-blue-200">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>กำลังโหลดข้อมูล</AlertTitle>
            <AlertDescription>
              กำลังดึงข้อมูลเริ่มต้นจาก Google Sheet... กรุณารอสักครู่
            </AlertDescription>
          </Alert>
        )}

        {initialLoadError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>ข้อผิดพลาดในการโหลดข้อมูล!</AlertTitle>
            <AlertDescription>
              {initialLoadError} โปรดตรวจสอบ:
              <ul className="list-disc list-inside mt-1">
                <li>Google API Key ในไฟล์ `.env` ถูกต้องและเปิดใช้งาน Sheets API แล้ว</li>
                <li>Google Sheet (ID: {GOOGLE_SHEET_ID}) ตั้งค่าการแชร์เป็น "Anyone with the link" (Viewer)</li>
                <li>ค่า `GOOGLE_SHEET_RANGE` ("{GOOGLE_SHEET_RANGE}") ในโค้ด `MotorcycleSearch.tsx` ตรงกับชื่อชีตและช่วงคอลัมน์จริงใน Google Sheet</li>
                <li>สำหรับรูปภาพ: ตรวจสอบว่า URL ใน Google Sheet เป็น **Direct URL** ไปยังรูปภาพ (เช่น .jpg, .png) หรือเป็นลิงก์ Google Drive ที่แชร์แบบสาธารณะและถูกแปลงได้</li>
                <li className="font-bold text-red-700">ข้อควรระวัง: Error 429 (Quota Exceeded) เกิดจากการร้องขอ API มากเกินไป. โปรดรอสักครู่และลองใหม่ หรือพิจารณาขอเพิ่มโควต้าใน Google Cloud Console.</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {!isInitialLoading && !initialLoadError && (
          <Alert className="mb-4 bg-green-100 text-green-900 border-green-200">
            <Check className="h-4 w-4" />
            <AlertTitle>เชื่อมต่อสำเร็จ!</AlertTitle>
            <AlertDescription>
              ข้อมูลจาก Google Sheet ถูกโหลดสำเร็จแล้ว. พร้อมสำหรับการค้นหา
            </AlertDescription>
          </Alert>
        )}

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
                  disabled={isInitialLoading || !!initialLoadError}
                />
                <Button onClick={handleSearch} disabled={isSearching || isInitialLoading || !!initialLoadError}>
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

        {/* แสดงผลการค้นหา หรือข้อมูลทั้งหมดเมื่อโหลดครั้งแรก */}
        {searchResults.length > 0 && !isSearching && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                ผลการค้นหา ({searchResults.length} รายการ)
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
                        <p>
                          <strong>ทะเบียนรถ:</strong> {result.plateNumber}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {/* ปุ่มดูรูปถ่ายคู่กับรถด้านหน้า */}
                        {result.frontPhotoUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => window.open(result.frontPhotoUrl, '_blank')}
                          >
                            ดูรูปถ่ายคู่กับรถด้านหน้า
                          </Button>
                        )}
                        {/* ปุ่มดูรูปถ่ายคู่กับทะเบียนรถ */}
                        {result.licensePlatePhotoUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2" // เพิ่ม mt-2 เพื่อเว้นระยะห่างระหว่างปุ่ม
                            onClick={() => window.open(result.licensePlatePhotoUrl, '_blank')}
                          >
                            ดูรูปถ่ายคู่กับทะเบียนรถ
                          </Button>
                        )}
                        {/* ถ้าไม่มี URL รูปภาพ ให้แสดงข้อความแจ้ง */}
                        {!result.frontPhotoUrl && !result.licensePlatePhotoUrl && (
                          <p className="text-sm text-muted-foreground">ไม่มีรูปภาพสำหรับรายการนี้</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* แสดงเมื่อไม่พบข้อมูลการค้นหา (หลังจากลองค้นหาแล้ว) */}
        {searchResults.length === 0 && searchQuery && !isSearching && !isInitialLoading && !initialLoadError && (
          <Card className="mt-6">
            <CardContent className="text-center py-8">
              <p className="text-gray-500">ไม่พบข้อมูลที่ค้นหา</p>
              <p className="text-sm text-gray-400 mt-2">
                กรุณาตรวจสอบข้อมูลและลองค้นหาใหม่อีกครั้ง
              </p>
            </CardContent>
          </Card>
        )}

        {/* แสดงเมื่อโหลดสำเร็จ แต่ยังไม่มีการค้นหา และไม่มีข้อมูลในชีท (ยกเว้นแถว Header) */}
        {searchResults.length === 0 && !searchQuery && !isSearching && !isInitialLoading && !initialLoadError && (
            <Card className="mt-6">
                <CardContent className="text-center py-8">
                    <p className="text-gray-500">ไม่พบข้อมูลใดๆ ใน Google Sheet</p>
                    <p className="text-sm text-gray-400 mt-2">
                        โปรดเพิ่มข้อมูลลงใน Google Sheet ของคุณ (นอกเหนือจากแถวส่วนหัว)
                    </p>
                </CardContent>
            </Card>
        )}

      </div>
    </div>
  );
};

export default MotorcycleSearch;
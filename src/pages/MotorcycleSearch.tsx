import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, ArrowLeft, Loader2, Filter, 
  Image as ImageIcon, ExternalLink, User, Bike, X, Download, ShieldCheck 
} from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';

// ฟังก์ชันแปลงลิงก์ Google Drive ให้แสดงผลรูปภาพได้
const getImageUrl = (driveUrl: string) => {
  if (!driveUrl) return '';
  const regExp = /id=([^&]+)|d\/([^/]+)\//;
  const match = driveUrl.match(regExp);
  const fileId = match ? (match[1] || match[2]) : null;

  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}=s800`; // ใช้รูปแบบดึงรูปที่เสถียรกว่า
  }
  return driveUrl;
};

const MotorcycleSearch = () => {
  const navigate = useNavigate();
  const { hasRole, loading: authLoading } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [allMotorcyclesData, setAllMotorcyclesData] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const GOOGLE_SHEET_ID = '1YqjDZXFLktWvwKg_2hY_kMGAhD69tmy6W4phpSfAMbM';
  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
  const GOOGLE_SHEET_RANGE = 'DATA!A:I';

  const canAccess = hasRole('super_admin') || hasRole('admin');

  // ดึงรายชื่อชั้นเรียนทั้งหมดจากข้อมูลที่มี
  const availableGrades = useMemo(() => {
    const grades = allMotorcyclesData
      .map(item => item.classGrade)
      .filter((grade): grade is string => !!grade && grade !== "");
    return ['all', ...Array.from(new Set(grades)).sort()];
  }, [allMotorcyclesData]);

  const fetchGoogleSheetData = useCallback(async () => {
    if (!GOOGLE_SHEET_ID || !GOOGLE_API_KEY) return [];

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${GOOGLE_SHEET_RANGE}?key=${GOOGLE_API_KEY}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const data = await response.json();
      if (!data.values || data.values.length <= 1) return [];

      const rawHeaders = data.values[0];
      const rows = data.values.slice(1);

      return rows.map((row: string[]) => {
        let rowData: { [key: string]: string } = {};
        rawHeaders.forEach((header: string, index: number) => {
          let key = '';
          const h = header.trim();
          if (h === 'ประทับเวลา') key = 'timestamp';
          else if (h === 'ชื่อ - สกุล') key = 'fullName';
          else if (h === 'ชั้น (Ex. 1/1)') key = 'classGrade';
          else if (h === 'ยี้ห้อ') key = 'brandModel';
          else if (h === 'สีของรถ (เช่น สีแดง)') key = 'vehicleColor';
          else if (h === 'ทะเบียนรถ ( 1ขข 1234 ร้อยเอ็ด)') key = 'plateNumber';
          else if (h === 'รูปถ่ายคู่กับรถด้านหน้า') key = 'frontPhotoUrl';
          else if (h === 'รูปถ่ายคู่กับทะเบียนรถ') key = 'licensePlatePhotoUrl';
          else key = h.replace(/\s+/g, '');
          rowData[key] = row[index] || '';
        });
        return rowData;
      });
    } catch (error: any) {
      console.error(error.message);
      return [];
    }
  }, [GOOGLE_SHEET_ID, GOOGLE_API_KEY]);

  useEffect(() => {
    if (!authLoading && canAccess) {
      const loadData = async () => {
        setIsInitialLoading(true);
        const data = await fetchGoogleSheetData();
        setAllMotorcyclesData(data);
        setSearchResults(data);
        setIsInitialLoading(false);
      };
      loadData();
    }
  }, [authLoading, canAccess, fetchGoogleSheetData]);

  const applyFilters = useCallback(() => {
    setIsSearching(true);
    const lowerCaseQuery = searchQuery.toLowerCase();

    const filtered = allMotorcyclesData.filter(m => {
      const matchesSearch = !searchQuery || 
        (m.plateNumber?.toLowerCase().includes(lowerCaseQuery)) ||
        (m.fullName?.toLowerCase().includes(lowerCaseQuery)) ||
        (m.brandModel?.toLowerCase().includes(lowerCaseQuery));
      const matchesGrade = selectedGrade === 'all' || m.classGrade === selectedGrade; // กรองข้อมูลเป็นชั้นเรียน
      return matchesSearch && matchesGrade;
    });

    setSearchResults(filtered);
    setTimeout(() => setIsSearching(false), 300);
  }, [searchQuery, selectedGrade, allMotorcyclesData]);

  useEffect(() => {
    if (allMotorcyclesData.length > 0) applyFilters();
  }, [selectedGrade, applyFilters]);

  // ฟังก์ชันส่งออก CSV สำหรับนำเข้า Supabase
  const exportToCSV = () => {
    if (searchResults.length === 0) return;

    const headers = ["license_plate", "brand_model", "vehicle_color", "owner_name", "classroom", "created_at"];
    const csvRows = searchResults.map(item => [
      `"${item.plateNumber || ''}"`,
      `"${item.brandModel || ''}"`,
      `"${item.vehicleColor || ''}"`,
      `"${item.fullName || ''}"`,
      `"${item.classGrade || ''}"`,
      `"${item.timestamp || new Date().toISOString()}"`
    ].join(","));

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `asw_moto_import_${new Date().getTime()}.csv`;
    link.click();
    
    toast({ title: "ดาวน์โหลด CSV สำเร็จ", description: "ไฟล์พร้อมสำหรับการ Import เข้า Supabase" });
  };

  if (authLoading || (isInitialLoading && canAccess)) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
      <p className="text-slate-500 font-medium tracking-wide">กำลังเข้าถึงฐานข้อมูล Cloud...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-20">
      <nav className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 px-4 h-16 flex items-center shadow-sm">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/home')} className="hover:bg-slate-100 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" /> กลับ
          </Button>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <h1 className="font-bold text-slate-800">ระบบสืบค้นทะเบียนรถ</h1>
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm" className="hidden sm:flex border-green-500 text-green-600 hover:bg-green-50">
            <Download className="h-4 w-4 mr-2" /> ส่งออก CSV
          </Button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 pt-8 space-y-6">
        <Card className="border-none shadow-lg bg-white overflow-hidden transition-all duration-300">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="พิมพ์ทะเบียน, ชื่อเจ้าของ หรือรุ่นรถ..."
                  className="pl-10 h-12 border-slate-200 focus:ring-2 focus:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
                />
              </div>
              <div className="md:col-span-3">
                <select
                  className="w-full h-12 px-4 rounded-md border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                >
                  <option value="all">ทุกชั้นเรียน</option>
                  {availableGrades.filter(g => g !== 'all').map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3">
                <Button onClick={applyFilters} className="w-full h-12 bg-blue-600 hover:bg-blue-700 shadow-md" disabled={isSearching}>
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "ค้นหาข้อมูล"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {searchResults.map((item, index) => (
            <Card key={index} className="border-none shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden bg-white">
              <div className="relative h-52 bg-slate-100 overflow-hidden cursor-zoom-in" onClick={() => setSelectedImage(getImageUrl(item.frontPhotoUrl))}>
                {item.frontPhotoUrl ? (
                  <img 
                    src={getImageUrl(item.frontPhotoUrl)} 
                    alt="Motorcycle" 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full opacity-20">
                    <ImageIcon className="h-12 w-12" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <span className="bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase">
                    {item.classGrade}
                  </span>
                </div>
              </div>

              <CardContent className="p-5 space-y-4">
                <div className="text-center">
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">{item.plateNumber}</h2>
                  <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center justify-center mt-1">
                    <Bike className="h-3 w-3 mr-1" /> {item.brandModel}
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t">
                  <div className="flex items-center text-sm text-slate-700">
                    <User className="h-4 w-4 mr-2 text-blue-500" />
                    <span className="font-semibold">{item.fullName}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">สีรถ: {item.vehicleColor}</span>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] text-blue-600 p-0" onClick={() => window.open(item.licensePlatePhotoUrl, '_blank')}>
                      <ExternalLink className="h-3 w-3 mr-1" /> รูปทะเบียน
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden bg-transparent border-none">
            <div className="relative group">
              <img src={selectedImage || ''} alt="Preview" className="w-full h-auto rounded-lg shadow-2xl scale-in" />
              <DialogClose className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black transition-colors">
                <X className="h-5 w-5" />
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>

        <div className="sm:hidden flex justify-center pt-4">
          <Button onClick={exportToCSV} variant="secondary" className="w-full bg-green-100 text-green-700 border-none">
            <Download className="h-4 w-4 mr-2" /> ดาวน์โหลดข้อมูล CSV
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MotorcycleSearch;
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, ArrowLeft, Loader2, AlertCircle, 
  Check, Filter, Image as ImageIcon, ExternalLink, User, Bike, X
} from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';

// ฟังก์ชันแปลงลิงก์ให้แสดงผลในเว็บได้ (หัวใจสำคัญ)
const getImageUrl = (driveUrl: string) => {
  if (!driveUrl) return '';
  // ดึง ID จากลิงก์รูปแบบต่างๆ ของ Google Drive
  const regExp = /id=([^&]+)|d\/([^/]+)\//;
  const match = driveUrl.match(regExp);
  const fileId = match ? (match[1] || match[2]) : null;

  if (fileId) {
    // ใช้ URL นี้เพื่อให้แสดงภาพในแท็ก <img> ได้โดยตรง
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  return driveUrl;
};

const MotorcycleSearch = () => {
  const navigate = useNavigate();
  const { user, hasRole, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [allMotorcyclesData, setAllMotorcyclesData] = useState<any[]>([]);
  
  // State สำหรับดูรูปใหญ่
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const GOOGLE_SHEET_ID = '1YqjDZXFLktWvwKg_2hY_kMGAhD69tmy6W4phpSfAMbM';
  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
  const GOOGLE_SHEET_RANGE = 'DATA!A:I';

  const canAccess = hasRole('super_admin') || hasRole('admin');

  const availableGrades = useMemo(() => {
    const grades = allMotorcyclesData
      .map(item => item.classGrade)
      .filter((grade): grade is string => !!grade && grade !== "");
    return ['all', ...Array.from(new Set(grades)).sort()];
  }, [allMotorcyclesData]);

  const fetchGoogleSheetData = useCallback(async () => {
    if (!GOOGLE_SHEET_ID || !GOOGLE_API_KEY) {
      setInitialLoadError("API Key หรือ Sheet ID ไม่ถูกต้อง");
      return [];
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${GOOGLE_SHEET_RANGE}?key=${GOOGLE_API_KEY}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Google Sheet API Error (${response.status})`);

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
      setInitialLoadError(error.message);
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
      const matchesGrade = selectedGrade === 'all' || m.classGrade === selectedGrade;
      return matchesSearch && matchesGrade;
    });

    setSearchResults(filtered);
    setTimeout(() => setIsSearching(false), 300);
  }, [searchQuery, selectedGrade, allMotorcyclesData]);

  useEffect(() => {
    if (allMotorcyclesData.length > 0) applyFilters();
  }, [selectedGrade, applyFilters]);

  if (authLoading || (isInitialLoading && canAccess)) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
      <p className="text-slate-500 font-medium">กำลังดึงข้อมูลจาก Google Sheet...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* Top Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 px-4 h-16 flex items-center">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/home')} className="hover:bg-slate-100">
            <ArrowLeft className="h-4 w-4 mr-2" /> ย้อนกลับ
          </Button>
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-slate-800">ระบบสืบค้น Cloud-Sheet</h1>
          </div>
          <div className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">CONNECTED</div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 pt-8 space-y-6">
        {/* Search Engine Card */}
        <Card className="border-none shadow-xl bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-7 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="พิมพ์ทะเบียน, ชื่อเจ้าของ หรือรุ่นรถ..."
                  className="pl-10 h-12 border-slate-200"
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
              <div className="md:col-span-2">
                <Button onClick={applyFilters} className="w-full h-12 bg-blue-600 hover:bg-blue-700" disabled={isSearching}>
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "ค้นหา"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {searchResults.map((item, index) => (
            <Card key={index} className="border-none shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden bg-white">
              {/* Photo Area */}
              <div className="relative h-52 bg-slate-100 overflow-hidden cursor-zoom-in" onClick={() => setSelectedImage(getImageUrl(item.frontPhotoUrl))}>
                {item.frontPhotoUrl ? (
                  <img 
                    src={getImageUrl(item.frontPhotoUrl)} 
                    alt="Motorcycle" 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x300/e2e8f0/64748b?text=Image+Private'; }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full opacity-20">
                    <ImageIcon className="h-12 w-12" />
                    <span className="text-xs mt-2">ไม่มีรูปภาพ</span>
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <span className="bg-white/90 backdrop-blur-sm text-blue-600 px-2 py-1 rounded shadow-sm text-xs font-bold">
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
                    <User className="h-4 w-4 mr-2 text-slate-400" />
                    <span className="font-semibold">{item.fullName}</span>
                  </div>
                  <div className="flex items-center text-xs text-slate-500">
                    <div className="h-2 w-2 rounded-full mr-2 bg-blue-400" />
                    <span>สีรถ: {item.vehicleColor}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 text-[10px] h-8" onClick={() => window.open(item.frontPhotoUrl, '_blank')}>
                    <ExternalLink className="h-3 w-3 mr-1" /> ลิงก์รูป 1
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-[10px] h-8" onClick={() => window.open(item.licensePlatePhotoUrl, '_blank')}>
                    <ExternalLink className="h-3 w-3 mr-1" /> ลิงก์รูป 2
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Modal สำหรับดูรูปใหญ่ */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden bg-transparent border-none">
            <div className="relative group">
              <img src={selectedImage || ''} alt="Preview" className="w-full h-auto rounded-lg shadow-2xl" />
              <DialogClose className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black transition-colors">
                <X className="h-5 w-5" />
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MotorcycleSearch;
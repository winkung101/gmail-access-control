import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, ArrowLeft, Loader2, 
  Image as ImageIcon, ExternalLink, User, Bike, X, Download, ShieldCheck, Database, Cloud, Maximize2 
} from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

// Helper: แปลงลิงก์รูปภาพ (LH3 Direct Link)
const getDriveImageUrl = (url: string) => {
  if (!url) return '';
  if (!url.includes('drive.google.com') && !url.includes('googleusercontent.com')) return url;
  
  const cleanUrl = url.split(',')[0].trim();
  const regExp = /\/d\/([a-zA-Z0-9_-]+)|id=([a-zA-Z0-9_-]+)/;
  const match = cleanUrl.match(regExp);
  const fileId = match ? (match[1] || match[2]) : null;

  if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}=s1000`; 
  return cleanUrl;
};

const MotorcycleSearch = () => {
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [allMotorcyclesData, setAllMotorcyclesData] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const GOOGLE_SHEET_ID = '1YqjDZXFLktWvwKg_2hY_kMGAhD69tmy6W4phpSfAMbM';
  const canAccess = true;

  // 1. ดึงข้อมูล Google Sheets
  const fetchGoogleSheetData = useCallback(async () => {
    if (!GOOGLE_SHEET_ID) return [];
    const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const text = await response.text();
      const jsonString = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
      
      if (!jsonString || !jsonString[1]) return [];
      
      const json = JSON.parse(jsonString[1]);
      const cols = json.table.cols;
      const rows = json.table.rows;

      if (!rows || rows.length === 0) return [];

      const colMap: { [key: string]: number } = {};
      cols.forEach((col: any, index: number) => {
        if (col && col.label) colMap[col.label.trim()] = index;
      });

      const getColIndex = (names: string[]) => {
        for (const name of names) {
          if (colMap[name] !== undefined) return colMap[name];
        }
        return -1;
      };

      const idxTime = getColIndex(['ประทับเวลา', 'Timestamp']);
      const idxName = getColIndex(['ชื่อ - สกุล', 'ชื่อ-สกุล', 'ชื่อ']);
      const idxClass = getColIndex(['ชั้น (Ex. 1/1)', 'ชั้น']);
      const idxBrand = getColIndex(['ยี้ห้อ', 'ยี่ห้อ']);
      const idxColor = getColIndex(['สีของรถ (เช่น สีแดง)', 'สีของรถ']);
      const idxPlate = getColIndex(['ทะเบียนรถ ( 1ขข 1234 ร้อยเอ็ด)', 'ทะเบียนรถ']);
      const idxPhotoFront = getColIndex(['รูปถ่ายคู่กับรถด้านหน้า']);
      const idxPhotoPlate = getColIndex(['รูปถ่ายคู่กับทะเบียนรถ']);

      return rows.map((row: any, index: number) => {
        const getVal = (idx: number) => (idx !== -1 && row.c[idx]) ? (row.c[idx].v || row.c[idx].f || '') : '';

        return {
          id: `google-${index}`,
          source: 'google',
          timestamp: getVal(idxTime),
          fullName: getVal(idxName),
          classGrade: getVal(idxClass),
          brandModel: getVal(idxBrand),
          vehicleColor: getVal(idxColor),
          plateNumber: getVal(idxPlate),
          frontPhotoUrl: getVal(idxPhotoFront),
          licensePlatePhotoUrl: getVal(idxPhotoPlate)
        };
      }).filter((item: any) => item.fullName && item.plateNumber);

    } catch (error) {
      console.error("Google Sheet Error:", error);
      return [];
    }
  }, []);

  // 2. ดึงข้อมูล Supabase
  const fetchSupabaseData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('motorcycles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((item) => ({
        id: item.id,
        source: 'supabase',
        timestamp: item.created_at,
        fullName: item.owner_name,
        classGrade: item.classroom,
        brandModel: item.brand_model,
        vehicleColor: item.vehicle_color,
        plateNumber: item.license_plate,
        frontPhotoUrl: item.vehicle_image_url,
        licensePlatePhotoUrl: item.plate_image_url
      }));
    } catch (error) {
      console.error("Supabase Error:", error);
      return [];
    }
  }, []);

  // รวมข้อมูล
  useEffect(() => {
    if (!authLoading && canAccess) {
      const loadAllData = async () => {
        setIsInitialLoading(true);
        const [googleData, supabaseData] = await Promise.all([
          fetchGoogleSheetData(),
          fetchSupabaseData()
        ]);
        
        setAllMotorcyclesData([...supabaseData, ...googleData]);
        setSearchResults([...supabaseData, ...googleData]);
        setIsInitialLoading(false);
      };
      loadAllData();
    }
  }, [authLoading, fetchGoogleSheetData, fetchSupabaseData]);

  const availableGrades = useMemo(() => {
    const grades = allMotorcyclesData
      .map(item => item.classGrade)
      .filter((grade): grade is string => !!grade && grade.trim() !== "");
    return ['all', ...Array.from(new Set(grades)).sort()];
  }, [allMotorcyclesData]);

  const applyFilters = useCallback(() => {
    setIsSearching(true);
    const lowerCaseQuery = searchQuery.toLowerCase().trim();

    const filtered = allMotorcyclesData.filter(m => {
      const matchesSearch = !searchQuery || 
        (m.plateNumber?.toLowerCase().includes(lowerCaseQuery)) ||
        (m.fullName?.toLowerCase().includes(lowerCaseQuery)) ||
        (m.brandModel?.toLowerCase().includes(lowerCaseQuery));
      const matchesGrade = selectedGrade === 'all' || m.classGrade === selectedGrade;
      return matchesSearch && matchesGrade;
    });

    setSearchResults(filtered);
    setTimeout(() => setIsSearching(false), 200);
  }, [searchQuery, selectedGrade, allMotorcyclesData]);

  useEffect(() => {
    if (allMotorcyclesData.length > 0) applyFilters();
  }, [selectedGrade, searchQuery, allMotorcyclesData.length]); 

  const exportToCSV = () => {
    if (searchResults.length === 0) return;
    const headers = ["Source", "ทะเบียนรถ", "ยี่ห้อ/รุ่น", "สี", "เจ้าของ", "ชั้นเรียน", "วันที่"];
    const csvRows = searchResults.map((item) => [
      item.source,
      `"${item.plateNumber || ''}"`,
      `"${item.brandModel || ''}"`,
      `"${item.vehicleColor || ''}"`,
      `"${item.fullName || ''}"`,
      `"${item.classGrade || ''}"`,
      `"${new Date(item.timestamp).toLocaleDateString('th-TH')}"`
    ].join(","));

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `hybrid_motorcycles_${Date.now()}.csv`;
    link.click();
    toast({ title: "ดาวน์โหลดสำเร็จ", description: "รวมข้อมูลจาก Google และ Database แล้ว" });
  };

  if (authLoading || isInitialLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
      <p className="text-slate-500 font-medium tracking-wide">กำลังรวมข้อมูล...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-20">
      <nav className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 px-4 h-16 flex items-center shadow-sm">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/home')} className="hover:bg-slate-100">
            <ArrowLeft className="h-4 w-4 mr-2" /> กลับ
          </Button>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <h1 className="font-bold text-slate-800">ระบบสืบค้นทะเบียนรถ</h1>
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm" className="hidden sm:flex border-green-500 text-green-600 hover:bg-green-50">
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 pt-8 space-y-6">
        <Card className="border-none shadow-lg bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="พิมพ์ทะเบียน, ชื่อ, หรือรุ่นรถ..."
                  className="pl-10 h-12 border-slate-200 focus:ring-2 focus:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <select
                  className="w-full h-12 px-4 rounded-md border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
                <div className="flex items-center justify-center h-12 bg-slate-50 rounded-md border border-slate-100 text-xs text-slate-500 px-4">
                  <span>รายการทั้งหมด: <strong>{searchResults.length}</strong> คัน</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {searchResults.map((item, index) => (
            <Card key={`${item.source}-${item.id}-${index}`} className="border-none shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden bg-white">
              <div className="relative h-52 bg-slate-100 overflow-hidden cursor-zoom-in group" onClick={() => item.frontPhotoUrl && setSelectedImage(getDriveImageUrl(item.frontPhotoUrl))}>
                {item.frontPhotoUrl ? (
                  <>
                    <img 
                      src={getDriveImageUrl(item.frontPhotoUrl)} 
                      alt="Motorcycle" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=No+Image'; }}
                    />
                    {/* Zoom Icon Overlay */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="text-white h-8 w-8 drop-shadow-md" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full opacity-20">
                    <ImageIcon className="h-12 w-12" />
                    <span className="text-xs mt-2">ไม่มีรูปภาพ</span>
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  {item.source === 'supabase' ? (
                    <span className="bg-blue-600/90 backdrop-blur-sm text-white px-2 py-1 rounded-full text-[10px] font-bold flex items-center shadow-sm"><Database className="w-3 h-3 mr-1" /> New</span>
                  ) : (
                    <span className="bg-green-600/90 backdrop-blur-sm text-white px-2 py-1 rounded-full text-[10px] font-bold flex items-center shadow-sm"><Cloud className="w-3 h-3 mr-1" /> Google</span>
                  )}
                </div>
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
                    <span className="font-semibold truncate">{item.fullName}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">สี: {item.vehicleColor}</span>
                    {item.licensePlatePhotoUrl && (
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] text-blue-600 p-0 hover:bg-blue-50" onClick={() => window.open(getDriveImageUrl(item.licensePlatePhotoUrl), '_blank')}>
                        <ExternalLink className="h-3 w-3 mr-1" /> รูปทะเบียน
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {searchResults.length === 0 && !isInitialLoading && (
          <div className="text-center py-12 text-slate-400">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>ไม่พบข้อมูลที่ค้นหา</p>
          </div>
        )}

        {/* Responsive Image Dialog */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-[95vw] md:max-w-4xl p-0 overflow-hidden bg-black/90 border-none shadow-2xl flex items-center justify-center h-auto max-h-[90vh]">
            <div className="relative w-full h-full flex items-center justify-center p-2">
              <img 
                src={selectedImage || ''} 
                alt="Preview" 
                className="w-full h-auto max-h-[85vh] object-contain rounded-md shadow-lg scale-in" 
                referrerPolicy="no-referrer"
              />
              <DialogClose className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors backdrop-blur-sm">
                <X className="h-6 w-6" />
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>

        <div className="sm:hidden flex justify-center pt-4">
          <Button onClick={exportToCSV} variant="secondary" className="w-full bg-green-100 text-green-700 border-none">
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MotorcycleSearch;
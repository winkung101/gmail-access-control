import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, ArrowLeft, Loader2, 
  Image as ImageIcon, ExternalLink, User, Bike, X, Download, ShieldCheck, Database, Cloud 
} from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

// ฟังก์ชันแปลงลิงก์ Google Drive ให้แสดงรูปได้
const getDriveImageUrl = (driveUrl: string) => {
  if (!driveUrl) return '';
  // ถ้าเป็นลิงก์ Supabase หรือลิงก์ตรงอยู่แล้ว ให้ใช้เลย
  if (driveUrl.startsWith('http') && !driveUrl.includes('drive.google.com')) return driveUrl;

  // แปลงลิงก์ Google Drive
  const regExp = /id=([^&]+)|d\/([^/]+)\//;
  const match = driveUrl.match(regExp);
  const fileId = match ? (match[1] || match[2]) : null;
  if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}=s800`; // ใช้ LH3 server เพื่อโหลดเร็ว
  return driveUrl;
};

// ฟังก์ชันช่วยตัดคำ CSV (รองรับกรณีมีเครื่องหมายลูกน้ำในข้อความ)
const parseCSVLine = (text: string) => {
  const result = [];
  let start = 0;
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') {
      inQuotes = !inQuotes;
    } else if (text[i] === ',' && !inQuotes) {
      result.push(text.substring(start, i).replace(/^"|"$/g, '').trim());
      start = i + 1;
    }
  }
  result.push(text.substring(start).replace(/^"|"$/g, '').trim());
  return result;
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

  // ID Google Sheet ของคุณ
  const GOOGLE_SHEET_ID = '1YqjDZXFLktWvwKg_2hY_kMGAhD69tmy6W4phpSfAMbM';
  
  const canAccess = true;

  // 1. ดึงข้อมูลจาก Google Sheets (แบบ CSV Export)
  const fetchGoogleSheetData = useCallback(async () => {
    if (!GOOGLE_SHEET_ID) return [];
    
    // ใช้ URL Export CSV (ดึง Sheet แรกเสมอ)
    const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=csv`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch Google Sheet');
      
      const csvText = await response.text();
      const rows = csvText.split('\n');

      if (rows.length <= 1) return [];

      // Map ข้อมูล (ข้าม Header บรรทัดแรก)
      return rows.slice(1).map((rowString, index) => {
        const cols = parseCSVLine(rowString);
        
        // เช็คว่ามีข้อมูลสำคัญครบไหม (Timestamp, ชื่อ, ชั้น, ทะเบียน)
        if (cols.length < 6) return null;

        return {
          id: `google-${index}`,
          source: 'google',
          timestamp: cols[0] || '', // A
          fullName: cols[1] || '',  // B
          classGrade: cols[2] || '', // C
          brandModel: cols[3] || '', // D
          vehicleColor: cols[4] || '', // E
          plateNumber: cols[5] || '', // F (ทะเบียน)
          frontPhotoUrl: cols[6] || '', // G (รูปหน้า)
          licensePlatePhotoUrl: cols[7] || '' // H (รูปทะเบียน)
        };
      }).filter((item: any) => item && item.fullName && item.plateNumber); // กรองแถวว่าง

    } catch (error) {
      console.error("Google Sheet Fetch Error:", error);
      return [];
    }
  }, []);

  // 2. ดึงข้อมูลจาก Supabase (Database)
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
      console.error("Supabase Fetch Error:", error);
      return [];
    }
  }, []);

  // รวมข้อมูล (Hybrid Load)
  useEffect(() => {
    if (!authLoading && canAccess) {
      const loadAllData = async () => {
        setIsInitialLoading(true);
        
        // ดึงพร้อมกัน 2 แหล่ง
        const [googleData, supabaseData] = await Promise.all([
          fetchGoogleSheetData(),
          fetchSupabaseData()
        ]);

        console.log(`Loaded: ${googleData.length} from Google, ${supabaseData.length} from DB`);

        // รวมข้อมูล (เอา Supabase ไว้ก่อนเพราะเป็นข้อมูลใหม่กว่า)
        const combinedData = [...supabaseData, ...googleData];
        
        setAllMotorcyclesData(combinedData);
        setSearchResults(combinedData);
        setIsInitialLoading(false);
      };
      loadAllData();
    }
  }, [authLoading, fetchGoogleSheetData, fetchSupabaseData]);

  // ตัวเลือกชั้นเรียน
  const availableGrades = useMemo(() => {
    const grades = allMotorcyclesData
      .map(item => item.classGrade)
      .filter((grade): grade is string => !!grade && grade.trim() !== "");
    return ['all', ...Array.from(new Set(grades)).sort()];
  }, [allMotorcyclesData]);

  // ระบบค้นหา
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

  // Export CSV
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
    toast({ title: "ดาวน์โหลดสำเร็จ", description: "ส่งออกข้อมูลรวม 2 แหล่งแล้ว" });
  };

  if (authLoading || isInitialLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
      <p className="text-slate-500 font-medium tracking-wide">กำลังเชื่อมต่อฐานข้อมูลและ Google Cloud...</p>
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
            <h1 className="font-bold text-slate-800 hidden sm:block">ระบบสืบค้นทะเบียนรถ (Hybrid)</h1>
            <h1 className="font-bold text-slate-800 sm:hidden">สืบค้นทะเบียน</h1>
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
                  <span>พบข้อมูล: <strong>{searchResults.length}</strong> คัน</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {searchResults.map((item, index) => (
            <Card key={`${item.source}-${item.id}-${index}`} className="border-none shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden bg-white">
              <div className="relative h-52 bg-slate-100 overflow-hidden cursor-zoom-in" onClick={() => item.frontPhotoUrl && setSelectedImage(getDriveImageUrl(item.frontPhotoUrl))}>
                {item.frontPhotoUrl ? (
                  <img 
                    src={getDriveImageUrl(item.frontPhotoUrl)} 
                    alt="Motorcycle" 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=No+Image'; }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full opacity-20">
                    <ImageIcon className="h-12 w-12" />
                    <span className="text-xs mt-2">ไม่มีรูปภาพ</span>
                  </div>
                )}
                {/* Badge บอกแหล่งที่มา */}
                <div className="absolute top-3 left-3">
                  {item.source === 'supabase' ? (
                    <span className="bg-blue-600/90 backdrop-blur-sm text-white px-2 py-1 rounded-full text-[10px] font-bold flex items-center shadow-sm">
                      <Database className="w-3 h-3 mr-1" /> New
                    </span>
                  ) : (
                    <span className="bg-green-600/90 backdrop-blur-sm text-white px-2 py-1 rounded-full text-[10px] font-bold flex items-center shadow-sm">
                      <Cloud className="w-3 h-3 mr-1" /> Google
                    </span>
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
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MotorcycleSearch;
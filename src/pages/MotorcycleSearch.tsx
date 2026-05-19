import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import aswLogo from '@/assets/asw-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, ArrowLeft, Loader2, 
  Image as ImageIcon, ExternalLink, User, Bike, X, Download, ShieldCheck, Database, Cloud, QrCode, CheckCircle, AlertTriangle, Ban, IdCard
} from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import html2canvas from 'html2canvas';
// ใช้ Library รุ่นใหม่ แก้ปัญหาหน้าขาวและสแกนไม่ติด
import { Scanner } from '@yudiel/react-qr-scanner'; 
import { QRCodeSVG } from 'qrcode.react';

// Helper: แปลงลิงก์รูปภาพ
const getDriveImageUrl = (url: string) => {
  if (!url) return '';
  if (!url.includes('drive.google.com') && !url.includes('googleusercontent.com')) return url;
  const cleanUrl = url.split(',')[0].trim();
  const regExp = /\/d\/([a-zA-Z0-9_-]+)|id=([a-zA-Z0-9_-]+)/;
  const match = cleanUrl.match(regExp);
  const fileId = match ? (match[1] || match[2]) : null;
  if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
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
  const [selectedPass, setSelectedPass] = useState<any | null>(null);
  const [isDownloadingCard, setIsDownloadingCard] = useState(false);
  
  const [showScanner, setShowScanner] = useState(false);

  const passCardRef = useRef<HTMLDivElement>(null); 
  const GOOGLE_SHEET_ID = '1YqjDZXFLktWvwKg_2hY_kMGAhD69tmy6W4phpSfAMbM';
  const canAccess = true;

  // --- 1. Fetch Google Sheets ---
  const fetchGoogleSheetData = useCallback(async () => {
    if (!GOOGLE_SHEET_ID) return [];
    const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json`;
    try {
      const response = await fetch(url);
      if (!response.ok) return [];
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
          fullName: getVal(idxName),
          classGrade: getVal(idxClass),
          brandModel: getVal(idxBrand),
          vehicleColor: getVal(idxColor),
          plateNumber: getVal(idxPlate),
          frontPhotoUrl: getVal(idxPhotoFront),
          licensePlatePhotoUrl: getVal(idxPhotoPlate),
          points: 100,
          hasLicense: null
        };
      }).filter((item: any) => item.fullName && item.plateNumber);
    } catch (error) {
      console.error(error);
      return [];
    }
  }, []);

  // --- 2. Fetch Supabase ---
  const fetchSupabaseData = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any).from('motorcycles').select('*').order('created_at', { ascending: false });
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
        licensePlatePhotoUrl: item.plate_image_url,
        points: item.points || 100,
        hasLicense: item.has_license
      }));
    } catch (error) {
      console.error(error);
      return [];
    }
  }, []);

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

  // --- QR Code Logic (@yudiel/react-qr-scanner) ---
  const handleScan = (result: any) => {
    if (result) {
      // Library นี้ return array ของ results
      const text = result[0]?.rawValue;
      if (text) {
        setSearchQuery(text);
        setShowScanner(false);
        toast({ title: "สแกนสำเร็จ!", description: `ค้นหา: ${text}`, className: "bg-green-500 text-white" });
      }
    }
  };

  const handleDownloadCard = async () => {
    if (!passCardRef.current) return;
    setIsDownloadingCard(true);
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(passCardRef.current, {
          useCORS: true,
          scale: 1.5,
          backgroundColor: '#ffffff',
          logging: false,
        });
        const image = canvas.toDataURL("image/jpeg", 0.9);
        const link = document.createElement("a");
        link.href = image;
        link.download = `ASW_Pass_${selectedPass?.plateNumber || 'card'}.jpg`;
        link.click();
        toast({ title: "บันทึกสำเร็จ", description: "รูปภาพถูกบันทึกลงเครื่องแล้ว" });
      } catch (error) {
        toast({ title: "บันทึกไม่สำเร็จ", description: "ลองแคปหน้าจอแทนนะครับ", variant: "destructive" });
      } finally {
        setIsDownloadingCard(false);
      }
    }, 100);
  };

  const exportToCSV = () => {
    if (searchResults.length === 0) return;
    const headers = ["Source", "ทะเบียนรถ", "ยี่ห้อ/รุ่น", "สี", "เจ้าของ", "ชั้นเรียน", "คะแนน"];
    const csvRows = searchResults.map((item) => [
      item.source,
      `"${item.plateNumber || ''}"`,
      `"${item.brandModel || ''}"`,
      `"${item.vehicleColor || ''}"`,
      `"${item.fullName || ''}"`,
      `"${item.classGrade || ''}"`,
      `"${item.points || 100}"`
    ].join(","));
    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `motorcycles_${Date.now()}.csv`;
    link.click();
    toast({ title: "ดาวน์โหลดสำเร็จ", description: "ส่งออกข้อมูลแล้ว" });
  };

  const getStatusColor = (points: number) => {
    if (points >= 80) return { bg: 'bg-green-500', text: 'สถานะ: ปกติ', icon: <CheckCircle className="h-4 w-4" /> };
    if (points >= 50) return { bg: 'bg-yellow-500', text: 'สถานะ: เฝ้าระวัง', icon: <AlertTriangle className="h-4 w-4" /> };
    return { bg: 'bg-red-500', text: 'สถานะ: ถูกระงับ', icon: <Ban className="h-4 w-4" /> };
  };

  if (authLoading || isInitialLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
      <p className="text-slate-500 font-medium">กำลังโหลดข้อมูล...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-20">
      
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 px-4 h-16 flex items-center shadow-sm">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/home')} className="hover:bg-slate-100">
            <ArrowLeft className="h-4 w-4 mr-2" /> กลับ
          </Button>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <h1 className="font-bold text-slate-800">สืบค้นทะเบียน</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowScanner(true)} variant="ghost" size="icon" className="sm:hidden text-blue-600 hover:bg-blue-50">
              <QrCode className="h-6 w-6" />
            </Button>
            <Button onClick={exportToCSV} variant="outline" size="sm" className="hidden sm:flex border-green-500 text-green-600 hover:bg-green-50">
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 pt-8 space-y-6">
        
        {/* Search Controls */}
        <Card className="border-none shadow-lg bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6 relative flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="ค้นหาทะเบียน, ชื่อ, หรือสแกน QR..."
                    className="pl-10 h-12 border-slate-200 focus:ring-2 focus:ring-blue-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={() => setShowScanner(true)} 
                  className="h-12 w-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md flex items-center justify-center"
                  title="สแกน QR Code"
                >
                  <QrCode className="h-6 w-6" />
                </Button>
              </div>
              <div className="md:col-span-3">
                <select
                  className="w-full h-12 px-4 rounded-md border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                >
                  <option value="all">ทุกชั้นเรียน</option>
                  {availableGrades.filter(g => g !== 'all').map(grade => <option key={grade} value={grade}>{grade}</option>)}
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

        {/* QR Scanner Modal (ใช้ตัวใหม่) */}
        <Dialog open={showScanner} onOpenChange={setShowScanner}>
          <DialogContent className="w-full h-full max-w-none p-0 overflow-hidden bg-black border-none m-0 rounded-none flex flex-col">
            <div className="relative flex-1 flex flex-col bg-black">
              <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                <h3 className="text-white font-bold flex items-center"><QrCode className="mr-2 h-5 w-5"/> สแกนบัตรผ่าน</h3>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full" onClick={() => setShowScanner(false)}>
                  <X className="h-6 w-6" />
                </Button>
              </div>

              <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                <Scanner 
                  onScan={handleScan}
                  formats={['qr_code']}
                  styles={{ container: { width: '100%', height: '100%' }, video: { objectFit: 'cover' } }}
                />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-64 border-2 border-white/50 rounded-xl relative animate-pulse">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-500 rounded-tl-xl"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-500 rounded-tr-xl"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-500 rounded-bl-xl"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-500 rounded-br-xl"></div>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-8 left-0 right-0 text-center z-20 pointer-events-none">
                <span className="text-white text-sm bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm">วาง QR Code ในกรอบ</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {searchResults.map((item, index) => (
            <Card key={`${item.source}-${item.id}-${index}`} className="border-none shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden bg-white">
              <div className="relative h-52 bg-slate-100 overflow-hidden cursor-zoom-in" onClick={() => item.frontPhotoUrl && setSelectedImage(getDriveImageUrl(item.frontPhotoUrl))}>
                {item.frontPhotoUrl ? (
                  <img src={getDriveImageUrl(item.frontPhotoUrl)} alt="Motorcycle" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=No+Image'; }} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full opacity-20"><ImageIcon className="h-12 w-12" /><span className="text-xs mt-2">ไม่มีรูปภาพ</span></div>
                )}
                <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" className="h-7 text-[10px] bg-white/90 text-slate-800 hover:bg-white border-none shadow-md backdrop-blur-md" onClick={() => setSelectedPass(item)}>
                    <QrCode className="h-3 w-3 mr-1 text-blue-600" /> บัตรผ่าน
                  </Button>
                </div>
                <div className="absolute top-3 right-3"><span className="bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase">{item.classGrade}</span></div>
              </div>
              <CardContent className="p-5 space-y-4">
                <div className="text-center">
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">{item.plateNumber}</h2>
                  <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center justify-center mt-1"><Bike className="h-3 w-3 mr-1" /> {item.brandModel}</div>
                </div>
                
                {/* --- ส่วนแสดงรายละเอียดเจ้าของรถ (ที่เคยหายไป) --- */}
                <div className="space-y-2 pt-3 border-t">
                  <div className="flex items-center text-sm text-slate-700">
                    <User className="h-4 w-4 mr-2 text-blue-500" />
                    <span className="font-semibold truncate">{item.fullName}</span>
                  </div>
                  <div className="flex items-center text-xs">
                    <IdCard className="h-3.5 w-3.5 mr-2 text-slate-400" />
                    {item.hasLicense === true && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
                        <CheckCircle className="h-3 w-3 mr-1" /> มีใบขับขี่
                      </span>
                    )}
                    {item.hasLicense === false && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                        <Ban className="h-3 w-3 mr-1" /> ไม่มีใบขับขี่
                      </span>
                    )}
                    {(item.hasLicense === null || item.hasLicense === undefined) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                        ไม่ระบุใบขับขี่
                      </span>
                    )}
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
                {/* ----------------------------------------------- */}

              </CardContent>
            </Card>
          ))}
        </div>

        {/* e-Pass Modal */}
        <Dialog open={!!selectedPass} onOpenChange={() => setSelectedPass(null)}>
          <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden border-none bg-white">
            <div className="relative">
              <div ref={passCardRef} className="bg-white"> 
                <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <img src={aswLogo} className="h-8 w-8 object-contain bg-white rounded-full p-0.5" />
                    <div><h3 className="text-sm font-bold">ASW e-Pass</h3><p className="text-[10px] text-slate-400">บัตรอนุญาตขับขี่ในสถานศึกษา</p></div>
                  </div>
                </div>
                {selectedPass && (
                  <div className="p-6 flex flex-col items-center space-y-4">
                    <div className={`${getStatusColor(selectedPass.points).bg} text-white px-4 py-1 rounded-full text-xs font-bold flex items-center shadow-sm`}><span className="mr-1">{getStatusColor(selectedPass.points).icon}</span>{getStatusColor(selectedPass.points).text} ({selectedPass.points} คะแนน)</div>
                    <div className="text-center w-full border-2 border-black rounded-lg p-2 bg-white"><h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{selectedPass.plateNumber}</h1><p className="text-xs text-slate-500 uppercase font-bold tracking-widest mt-1">ROI ET</p></div>
                    <div className="w-full space-y-2 text-sm">
                      <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-400">เจ้าของรถ</span><span className="font-semibold text-slate-800">{selectedPass.fullName}</span></div>
                      <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-400">ระดับชั้น</span><span className="font-semibold text-slate-800">{selectedPass.classGrade}</span></div>
                      <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-400">ยานพาหนะ</span><span className="font-semibold text-slate-800">{selectedPass.brandModel} ({selectedPass.vehicleColor})</span></div>
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-slate-400">ใบขับขี่</span>
                        <span className={`font-semibold ${selectedPass.hasLicense === true ? 'text-green-600' : selectedPass.hasLicense === false ? 'text-red-600' : 'text-slate-500'}`}>
                          {selectedPass.hasLicense === true ? '✓ มีใบขับขี่' : selectedPass.hasLicense === false ? '✗ ไม่มีใบขับขี่' : 'ไม่ระบุ'}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-inner">
                      <QRCodeSVG value={selectedPass.plateNumber} size={120} level="H" includeMargin={true} />
                    </div>
                    <p className="text-[10px] text-slate-400 text-center">สแกนเพื่อตรวจสอบข้อมูลในระบบ<br/>Issued by ASW-Moto System</p>
                  </div>
                )}
              </div>
              <div className="bg-slate-50 p-3 border-t border-slate-100 flex justify-center gap-2"><Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setSelectedPass(null)} disabled={isDownloadingCard}>ปิด</Button><Button variant="default" size="sm" className="w-full text-xs bg-blue-600 hover:bg-blue-700" onClick={handleDownloadCard} disabled={isDownloadingCard}>{isDownloadingCard ? <Loader2 className="animate-spin h-3 w-3 mr-1" /> : <Download className="h-3 w-3 mr-1" />}{isDownloadingCard ? 'กำลังสร้าง...' : 'บันทึกรูปบัตร'}</Button></div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Full Image Dialog */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-[95vw] md:max-w-4xl p-0 overflow-hidden bg-black/90 border-none shadow-2xl flex items-center justify-center h-auto max-h-[90vh]">
            <div className="relative w-full h-full flex items-center justify-center p-2"><img src={selectedImage || ''} alt="Preview" className="w-full h-auto max-h-[85vh] object-contain rounded-md shadow-lg scale-in" referrerPolicy="no-referrer" /><DialogClose className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors backdrop-blur-sm"><X className="h-6 w-6" /></DialogClose></div>
          </DialogContent>
        </Dialog>

        <div className="sm:hidden flex justify-center pt-4"><Button onClick={exportToCSV} variant="secondary" className="w-full bg-green-100 text-green-700 border-none"><Download className="h-4 w-4 mr-2" /> CSV</Button></div>
      </div>
    </div>
  );
};

export default MotorcycleSearch;
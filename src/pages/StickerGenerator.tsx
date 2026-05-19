import { useState, useEffect, useCallback } from 'react';
import aswLogo from '@/assets/asw-logo.png';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Printer, CheckSquare, Square, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

const StickerGenerator = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const GOOGLE_SHEET_ID = '1YqjDZXFLktWvwKg_2hY_kMGAhD69tmy6W4phpSfAMbM';

  // 1. ดึงข้อมูล Google Sheets (Logic เดียวกับหน้า Search)
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
      const idxPlate = getColIndex(['ทะเบียนรถ ( 1ขข 1234 ร้อยเอ็ด)', 'ทะเบียนรถ']);

      return rows.map((row: any, index: number) => {
        const getVal = (idx: number) => (idx !== -1 && row.c[idx]) ? (row.c[idx].v || row.c[idx].f || '') : '';
        return {
          id: `google-${index}`,
          owner_name: getVal(idxName),
          classroom: getVal(idxClass),
          brand_model: getVal(idxBrand),
          license_plate: getVal(idxPlate),
          source: 'google'
        };
      }).filter((item: any) => item.owner_name && item.license_plate);

    } catch (error) {
      console.error("Google Sheet Error:", error);
      return [];
    }
  }, []);

  // 2. ดึงข้อมูล Supabase
  const fetchSupabaseData = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any).from('motorcycles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Supabase Error:", error);
      return [];
    }
  }, []);

  // รวมข้อมูล
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      const [googleData, supabaseData] = await Promise.all([
        fetchGoogleSheetData(),
        fetchSupabaseData()
      ]);
      
      console.log(`Loaded: Google=${googleData.length}, Supabase=${supabaseData.length}`);
      setStudents([...supabaseData, ...googleData]);
      setLoading(false);
    };
    loadAllData();
  }, [fetchGoogleSheetData, fetchSupabaseData]);

  // จัดการการเลือก
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  // กรองข้อมูล
  const filteredStudents = students.filter(s => 
    (s.license_plate || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.owner_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.classroom || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectAll = () => {
    if (selectedIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedIds(new Set()); // ยกเลิกทั้งหมด
    } else {
      setSelectedIds(new Set(filteredStudents.map(s => s.id))); // เลือกทั้งหมดที่กรองอยู่
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      <span className="ml-3 text-slate-500">กำลังรวมข้อมูล...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* CSS สำหรับโหมดพิมพ์ */}
      <style>{`
        @media print {
          @page { size: A4; margin: 0.5cm; }
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { 
            position: absolute; left: 0; top: 0; width: 100%; 
            display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header & Tools (จะไม่ถูกพิมพ์) */}
      <div className="no-print bg-white border-b sticky top-0 z-50 px-6 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/home')}><ArrowLeft className="h-4 w-4 mr-2" /> กลับ</Button>
          <h1 className="font-bold text-slate-800 flex items-center">
            <Printer className="mr-2 h-5 w-5 text-blue-600" /> พิมพ์สติ๊กเกอร์
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 px-3 py-1 rounded-full text-xs text-slate-600">
            เลือกแล้ว: <b>{selectedIds.size}</b> คัน
          </div>
          <Button onClick={() => window.print()} disabled={selectedIds.size === 0} className="bg-blue-600 hover:bg-blue-700">
            สั่งพิมพ์ทันที
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-6 flex gap-6">
        
        {/* Sidebar: รายชื่อเลือก (No Print) */}
        <div className="w-1/3 space-y-4 no-print h-[calc(100vh-100px)] flex flex-col">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="ค้นหาทะเบียน, ชื่อ..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          
          <div className="flex items-center justify-between px-2">
            <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">
              {selectedIds.size > 0 && selectedIds.size === filteredStudents.length ? <CheckSquare className="mr-1 h-3 w-3"/> : <Square className="mr-1 h-3 w-3"/>}
              เลือกทั้งหมด ({filteredStudents.length})
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto border rounded-lg bg-white p-2 space-y-1 shadow-sm">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">ไม่พบข้อมูล</div>
            ) : (
              filteredStudents.map((s) => (
                <div 
                  key={s.id} 
                  onClick={() => toggleSelection(s.id)}
                  className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${selectedIds.has(s.id) ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'}`}
                >
                  <Checkbox checked={selectedIds.has(s.id)} className="mr-3" />
                  <div className="flex-1">
                    <div className="font-bold text-sm text-slate-800">{s.license_plate}</div>
                    <div className="text-xs text-slate-500">{s.owner_name} ({s.classroom})</div>
                  </div>
                  <span className="text-[9px] px-1 bg-slate-100 rounded text-slate-400">{s.source === 'google' ? 'G' : 'DB'}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Preview Area: พื้นที่แสดงตัวอย่าง A4 (จะถูกพิมพ์) */}
        <div className="flex-1 bg-slate-200 p-8 overflow-y-auto h-[calc(100vh-100px)] flex justify-center">
          
          {/* กระดาษ A4 จำลอง */}
          <div id="printable-area" className="bg-white w-[210mm] min-h-[297mm] shadow-2xl p-[10mm] grid grid-cols-2 content-start gap-4">
            
            {selectedIds.size === 0 && (
              <div className="col-span-2 h-full flex flex-col items-center justify-center text-slate-300 py-20">
                <Printer className="h-16 w-16 mb-4" />
                <p>เลือกรายการทางซ้ายเพื่อสร้างสติ๊กเกอร์</p>
              </div>
            )}

            {/* Loop สร้างสติ๊กเกอร์แต่ละใบ */}
            {students.filter(s => selectedIds.has(s.id)).map((s) => (
              <div key={s.id} className="border-2 border-slate-800 rounded-xl p-2 flex items-center gap-3 relative overflow-hidden h-[5.5cm]">
                
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-20 h-20 bg-blue-100 rounded-full opacity-50 z-0"></div>
                
                {/* Logo & QR */}
                <div className="flex flex-col items-center justify-center z-10 w-1/3 border-r border-dashed border-slate-300 pr-2">
                  <img src={aswLogo} className="h-10 w-10 mb-1" />
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(s.license_plate)}`} 
                    className="h-16 w-16 border p-1 rounded bg-white"
                  />
                  <span className="text-[8px] mt-1 text-slate-500">SCAN ME</span>
                </div>

                {/* Info */}
                <div className="flex-1 z-10 pl-1">
                  <div className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">ASW PERMIT 2025</div>
                  <div className="text-3xl font-black text-slate-900 leading-none mt-1 uppercase tracking-tighter truncate">
                    {s.license_plate}
                  </div>
                  <div className="text-xs font-bold text-slate-500 mb-2 uppercase">ROI ET</div>
                  
                  <div className="bg-slate-100 p-2 rounded-lg space-y-1">
                    <div className="text-[10px] text-slate-600 truncate">
                      <span className="font-bold">เจ้าของ:</span> {s.owner_name}
                    </div>
                    <div className="text-[10px] text-slate-600">
                      <span className="font-bold">ชั้น:</span> {s.classroom}
                    </div>
                    <div className="text-[10px] text-slate-600 truncate">
                      <span className="font-bold">รถ:</span> {s.brand_model}
                    </div>
                  </div>
                </div>

                {/* Badge Number */}
                <div className="absolute bottom-2 right-2 text-[8px] text-slate-300 font-mono">
                  ID: {s.id.toString().substring(0, 6)}
                </div>
              </div>
            ))}

          </div>
        </div>

      </div>
    </div>
  );
};

export default StickerGenerator;
// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import MotorcycleRegistration from "./pages/MotorcycleRegistration";
import ScoreManagement from "./pages/ScoreManagement";
import MotorcycleSearch from "./pages/MotorcycleSearch";
import NotFound from "./pages/NotFound";
import AppFooter from "./components/AppFooter"; // เพิ่ม: นำเข้า AppFooter
import Dashboard from "./pages/Dashboard";
import StickerGenerator from "./pages/StickerGenerator";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="flex flex-col min-h-screen"> {/* เพิ่ม flex-col และ min-h-screen */}
            <main className="flex-grow"> {/* เพิ่ม main และ flex-grow เพื่อให้ content ขยายเต็มที่และดัน footer ลงไป */}
              <Routes>
                <Route path="/" element={<Index />} />
                <Route
                  path="/auth"
                  element={
                    <ProtectedRoute requireAuth={false}>
                      <Auth />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/home"
                  element={
                    <ProtectedRoute>
                      <Home />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/motorcycle-registration"
                  element={
                    <ProtectedRoute>
                      <MotorcycleRegistration />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/motorcycle-search"
                  element={
                    <ProtectedRoute>
                      <MotorcycleSearch />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
                <Route path="/score-management" element={<ScoreManagement />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/sticker-generator" element={<StickerGenerator />} />
              </Routes>
            </main>
            <AppFooter /> {/* เพิ่ม AppFooter ที่นี่ */}
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
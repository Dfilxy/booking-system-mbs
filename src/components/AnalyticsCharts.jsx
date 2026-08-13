import React from 'react';
import { TrendingUp, Clock, CalendarCheck, DollarSign, Award } from 'lucide-react';

export default function AnalyticsCharts({ bookings = [], slots = [] }) {
  // Hitung jam sibuk
  const timeCounts = {};
  bookings.forEach(b => {
    if (b.booking_time) {
      timeCounts[b.booking_time] = (timeCounts[b.booking_time] || 0) + 1;
    }
  });

  const popularTimes = Object.entries(timeCounts).sort((a, b) => b[1] - a[1]);
  const maxCount = popularTimes.length > 0 ? Math.max(...Object.values(timeCounts)) : 1;

  // Hitung status breakdown
  const statusCounts = {
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length
  };

  const totalBookingsCount = bookings.length || 1;
  const totalRevenue = bookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
      
      {/* Chart 1: Peak Hours (Jam Tersibuk) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Analisis Jam Tersibuk (Peak Hours)</h3>
              <p className="text-xs text-slate-400">Frekuensi reservasi berdasarkan slot jam</p>
            </div>
          </div>
          <span className="text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap shrink-0">
            Realtime Analytics
          </span>
        </div>

        {popularTimes.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">Belum ada data reservasi untuk ditampilkan</div>
        ) : (
          <div className="space-y-4">
            {popularTimes.slice(0, 5).map(([time, count], idx) => {
              const percentage = Math.round((count / maxCount) * 100);
              return (
                <div key={time} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-200 flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px]">
                        #{idx + 1}
                      </span>
                      <span>Jam {time} WIB</span>
                    </span>
                    <span className="text-emerald-400">{count} Booking ({percentage}%)</span>
                  </div>
                  
                  {/* Progress Bar Visual */}
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 shadow-sm shadow-emerald-500/30"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chart 2: Status Breakdown & Financial Summary */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Ringkasan Performa & Status</h3>
                <p className="text-xs text-slate-400">Distribusi status reservasi masuk</p>
              </div>
            </div>
            <Award className="w-6 h-6 text-emerald-400" />
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-2.5 sm:p-3 text-center">
              <span className="text-[10px] sm:text-xs text-slate-400 block mb-1 truncate font-medium">Terkonfirmasi</span>
              <span className="text-lg sm:text-xl font-extrabold text-emerald-400">{statusCounts.confirmed}</span>
              <span className="text-[10px] text-slate-500 block mt-1">
                ({Math.round((statusCounts.confirmed / totalBookingsCount) * 100)}%)
              </span>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-2.5 sm:p-3 text-center">
              <span className="text-[10px] sm:text-xs text-slate-400 block mb-1 truncate font-medium">Selesai Main</span>
              <span className="text-lg sm:text-xl font-extrabold text-sky-400">{statusCounts.completed}</span>
              <span className="text-[10px] text-slate-500 block mt-1">
                ({Math.round((statusCounts.completed / totalBookingsCount) * 100)}%)
              </span>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3 text-center">
              <span className="text-xs text-slate-400 block mb-1">Dibatalkan</span>
              <span className="text-xl font-extrabold text-rose-400">{statusCounts.cancelled}</span>
              <span className="text-[10px] text-slate-500 block mt-1">
                ({Math.round((statusCounts.cancelled / totalBookingsCount) * 100)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Revenue Card Banner */}
        <div className="bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-emerald-300 font-medium">Total Estimasi Omset Reservasi</p>
              <p className="text-2xl font-black text-white">
                Rp {Number(totalRevenue).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
            Terverifikasi
          </span>
        </div>

      </div>

    </div>
  );
}

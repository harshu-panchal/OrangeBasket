import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { TrendingUp, ArrowUpRight, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";
import { deliveryApi } from "../services/deliveryApi";
import DeliveryFooter from "../components/DeliveryFooter";

const RUPEE = "\u20B9";
const DOT = "\u2022";
const resolveTipAmount = (txn) =>
  Number(
    txn?.meta?.tipAmount ??
      txn?.order?.paymentBreakdown?.riderTipAmount ??
      txn?.order?.pricing?.tip ??
      0,
  );

import { useNavigate } from "react-router-dom";

const EarningsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("daily");
  const [targetDate, setTargetDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [earningsData, setEarningsData] = useState({
    totalEarnings: 0,
    incentives: 0,
    bonuses: 0,
    tipsReceived: 0,
    chartData: [],
    recentTransactions: [],
  });

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const response = await deliveryApi.getEarnings(activeTab, targetDate.toISOString());
      if (response.data.success && response.data.result) {
        const result = response.data.result;
        setEarningsData({
          totalEarnings: result.totalEarnings || 0,
          incentives: result.incentives || 0,
          bonuses: result.bonuses || 0,
          tipsReceived: result.tipsReceived || 0,
          chartData: result.chartData || [],
          recentTransactions: result.transactions || result.recentTransactions || [],
        });
      }
    } catch {
      toast.error("Failed to fetch earnings data");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchEarnings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, targetDate]);

  const handlePrevDate = () => {
    const newDate = new Date(targetDate);
    if (activeTab === "daily") {
      newDate.setDate(newDate.getDate() - 1);
    } else if (activeTab === "weekly") {
      newDate.setDate(newDate.getDate() - 7);
    } else if (activeTab === "monthly") {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setTargetDate(newDate);
  };

  const handleNextDate = () => {
    const newDate = new Date(targetDate);
    if (activeTab === "daily") {
      newDate.setDate(newDate.getDate() + 1);
    } else if (activeTab === "weekly") {
      newDate.setDate(newDate.getDate() + 7);
    } else if (activeTab === "monthly") {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setTargetDate(newDate);
  };

  const formatTargetDate = () => {
    if (activeTab === "daily") {
      return targetDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } else if (activeTab === "monthly") {
      return targetDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    } else {
      const d = new Date(targetDate);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(d.setDate(diff));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50/50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50/50 min-h-screen pb-24">
      {/* Header & Sticky Area */}
      <div className="bg-white sticky top-0 z-30 px-5 py-4 shadow-sm border-b border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ChevronLeft size={24} className="text-gray-900" />
          </button>
          <h1 className="text-[17px] font-bold text-gray-900">Earnings</h1>
          <div className="w-8"></div> {/* Spacer for centering */}
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-full mb-6">
          {["daily", "weekly", "monthly"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-bold rounded-full transition-all capitalize ${
                activeTab === tab
                  ? "bg-[#ff8200] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Date Selector */}
        <div className="flex justify-between items-center mb-2 px-2">
          <button className="p-1" onClick={handlePrevDate}>
            <ChevronLeft size={18} className="text-slate-500" />
          </button>
          <span className="font-bold text-slate-800 text-[14px]">{formatTargetDate()}</span>
          <button className="p-1" onClick={handleNextDate}>
            <ChevronRight size={18} className="text-slate-500" />
          </button>
        </div>
      </div>

      <motion.div
        className="p-6 space-y-6 max-w-lg mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Unified Earnings Card */}
        <motion.div variants={itemVariants}>
          <div className="bg-white rounded-[24px] p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100/50 flex flex-col items-center">
            <p className="text-slate-500 text-[13px] font-semibold mb-2">Total Earnings</p>
            <div className="flex items-center justify-center">
              <span className="text-[40px] leading-none font-bold text-slate-900 tracking-tight">
                {RUPEE}{Number(earningsData.totalEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="flex items-center mt-3 mb-6 text-[13px] font-bold">
              <ArrowUpRight size={16} className="text-[#4ade80] mr-1" strokeWidth={3} />
              <span className="text-[#4ade80] mr-1">12%</span>
              <span className="text-slate-400 font-medium">vs yesterday</span>
            </div>

            <div className="w-full h-[1px] bg-slate-100 mb-6"></div>

            <div className="w-full space-y-4 mb-8">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium text-[14px]">Order Earnings</span>
                <span className="text-slate-900 font-bold text-[15px]">
                  {RUPEE}{Number((earningsData.totalEarnings || 0) - (earningsData.incentives || 0) - (earningsData.tipsReceived || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium text-[14px]">Incentives</span>
                <span className="text-slate-900 font-bold text-[15px]">
                  {RUPEE}{Number(earningsData.incentives || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium text-[14px]">Tips</span>
                <span className="text-slate-900 font-bold text-[15px]">
                  {RUPEE}{Number(earningsData.tipsReceived || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Chart */}
            <div className="w-full h-36 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={earningsData.chartData} barSize={10}>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }}
                    dy={10}
                  />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Bar
                    dataKey="earnings"
                    fill="#dcfce7"
                    radius={[0, 0, 4, 4]}
                    stackId="a"
                  />
                  <Bar
                    dataKey="incentives"
                    fill="#86efac"
                    radius={[4, 4, 0, 0]}
                    stackId="a"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <button 
              className="text-[#22c55e] font-bold text-[14px] flex items-center justify-center"
              onClick={() => toast.info("Detailed breakdown coming soon!")}
            >
              View Detailed Breakdown <ChevronRight size={16} className="ml-1" strokeWidth={2.5} />
            </button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-800">Recent Earnings</h3>
              <Button variant="link" className="text-primary text-xs font-bold h-auto p-0" onClick={() => toast.info("Full history coming soon!")}>
                View All
              </Button>
            </div>
            <div className="divide-y divide-gray-100">
              {Array.isArray(earningsData.recentTransactions) && earningsData.recentTransactions.length > 0 ? (
                earningsData.recentTransactions.map((txn, idx) => (
                  <div
                    key={txn._id || txn.id || `txn-${idx}`}
                    className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center">
                      <div
                        className={`p-2 rounded-full mr-3 ${
                          txn.status === "Settled" || txn.status === "Completed"
                            ? "bg-brand-100 text-brand-600"
                            : "bg-yellow-100 text-yellow-600"
                        }`}
                      >
                        <ArrowUpRight size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{txn.type}</p>
                        <p className="text-xs text-gray-500">
                          {txn.date ||
                            new Date(txn.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}{" "}
                          {DOT}{" "}
                          {txn.id ||
                            (txn._id ? txn._id.toString().slice(-6).toUpperCase() : "N/A")}
                        </p>
                        {resolveTipAmount(txn) > 0 && (
                          <p className="text-[11px] font-bold text-pink-600">
                            Includes tip: {RUPEE}{resolveTipAmount(txn).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        {String(txn.type || "").includes("Withdrawal") ? "-" : "+"}
                        {RUPEE}
                        {Number(txn.amount || 0).toLocaleString()}
                      </p>
                      <p
                        className={`text-xs font-bold ${
                          txn.status === "Settled" || txn.status === "Completed"
                            ? "text-brand-500"
                            : "text-yellow-500"
                        }`}
                      >
                        {txn.status}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-gray-400 text-sm italic">
                  No recent earnings or withdrawals.
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </motion.div>
      <DeliveryFooter />
    </div>
  );
};

export default EarningsPage;


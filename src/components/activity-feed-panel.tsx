import { Activity, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ActivityFeedRow = {
  id: number;
  action: string;
  detail: string | null;
  createdAt: string;
  userName: string;
  divisionName: string | null;
};

const ACTION_LABELS: Record<string, string> = {
  "announcement.create": "Membuat pengumuman",
  "announcement.delete": "Menghapus pengumuman",
  "attendance.close": "Menutup presensi",
  "attendance.manual": "Menandai presensi manual",
  "attendance.open": "Membuka presensi",
  "document.delete": "Menghapus dokumen",
  "document.link": "Menambah link dokumen",
  "document.upload": "Mengunggah dokumen",
  "event_document.delete": "Menghapus dokumen event",
  "event_document.link": "Menambah dokumen event",
  "event_document.upload": "Mengunggah dokumen event",
  "milestone.create": "Menambah milestone",
  "milestone.delete": "Menghapus milestone",
  "milestone.toggle": "Mengubah milestone",
  "task.checklist": "Mengubah checklist",
  "task.comment": "Mengomentari tugas",
  "task.create": "Membuat tugas",
  "task.delete": "Menghapus tugas",
  "task.status": "Mengubah status tugas",
  "task.update": "Memperbarui tugas",
};

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function activityLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replaceAll(".", " ");
}

export function ActivityFeedPanel({
  activities,
}: {
  activities: ActivityFeedRow[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Hari ini
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="py-3 text-center text-sm text-slate-500">
            Belum ada aktivitas penting dalam 24 jam terakhir.
          </p>
        ) : (
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {activities.map((item) => (
              <div key={item.id} className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">
                      {activityLabel(item.action)}
                    </p>
                    {item.divisionName && (
                      <Badge variant="outline" className="font-normal">
                        {item.divisionName}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.userName} - {formatTime(item.createdAt)}
                  </p>
                  {item.detail && (
                    <p className="mt-1 truncate text-sm text-slate-600">
                      {item.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

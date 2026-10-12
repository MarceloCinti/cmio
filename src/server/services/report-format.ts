import { formatNumericDate, formatTime as fmtTime } from "@/lib/format";

export const formatDate = (d: Date) => formatNumericDate(d);
export const formatTime = (d: Date) => fmtTime(d);

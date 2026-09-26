// 代休の対象にできる「未消化の休日出勤日」一覧を返すAPI
// 休日出勤(holiday_work)のうち、まだ代休(compensatory_leave)で相殺されていない日を返す

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentStaff } from '@/lib/auth/helpers';

export async function GET() {
  try {
    const supabase = await createClient();

    // 認証チェック
    const staff = await getCurrentStaff();

    // 自分の休日出勤日を取得
    const { data: holidayWorkRecords, error: hwError } = await supabase
      .from('attendance_records')
      .select('date')
      .eq('staff_id', staff.id)
      .eq('leave_type', 'holiday_work')
      .order('date', { ascending: false });

    if (hwError) {
      console.error('休日出勤日取得エラー:', hwError);
      return NextResponse.json(
        { success: false, error: { message: '休日出勤日の取得に失敗しました' } },
        { status: 500 }
      );
    }

    // 既に代休で消化済みの休日出勤日を取得
    const { data: compensatoryRecords, error: compError } = await supabase
      .from('attendance_records')
      .select('compensatory_leave_date')
      .eq('staff_id', staff.id)
      .eq('leave_type', 'compensatory_leave')
      .not('compensatory_leave_date', 'is', null);

    if (compError) {
      console.error('代休記録取得エラー:', compError);
      return NextResponse.json(
        { success: false, error: { message: '代休記録の取得に失敗しました' } },
        { status: 500 }
      );
    }

    // 消化済みの日付をカウント（同じ日を複数回相殺できないよう1対1で管理）
    const usedCount = new Map<string, number>();
    (compensatoryRecords ?? []).forEach((rec) => {
      const d = rec.compensatory_leave_date as string | null;
      if (d) {
        usedCount.set(d, (usedCount.get(d) ?? 0) + 1);
      }
    });

    // 休日出勤日ごとの件数から消化済み分を差し引き、未消化の日だけを残す
    const holidayWorkCount = new Map<string, number>();
    (holidayWorkRecords ?? []).forEach((rec) => {
      const d = rec.date as string;
      holidayWorkCount.set(d, (holidayWorkCount.get(d) ?? 0) + 1);
    });

    const availableDates: string[] = [];
    // 日付降順を維持するため holidayWorkRecords の順序で走査
    const seen = new Set<string>();
    (holidayWorkRecords ?? []).forEach((rec) => {
      const d = rec.date as string;
      if (seen.has(d)) return;
      seen.add(d);
      const total = holidayWorkCount.get(d) ?? 0;
      const used = usedCount.get(d) ?? 0;
      const remaining = total - used;
      for (let i = 0; i < remaining; i++) {
        availableDates.push(d);
      }
    });

    return NextResponse.json({
      success: true,
      data: { dates: availableDates },
    });
  } catch (error) {
    console.error('未消化休日出勤日取得エラー:', error);
    return NextResponse.json(
      { success: false, error: { message: '未消化の休日出勤日の取得に失敗しました' } },
      { status: 500 }
    );
  }
}

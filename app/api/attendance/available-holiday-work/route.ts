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

    // 既に取得済みの代休を取得（紐付け先の休日出勤日も含める）。
    // 代休は必ず休日出勤と相殺されるため件数分だけ休日出勤を消費するが、
    // 対象日(compensatory_leave_date)が紐付いている代休は、その特定の休日出勤日を直接消化する。
    // （紐付けのある休日出勤を候補から外すことで、ユーザーが相殺したペアを候補に出さない）
    const { data: compensatoryRecords, error: compError } = await supabase
      .from('attendance_records')
      .select('compensatory_leave_date')
      .eq('staff_id', staff.id)
      .eq('leave_type', 'compensatory_leave');

    if (compError) {
      console.error('代休記録取得エラー:', compError);
      return NextResponse.json(
        { success: false, error: { message: '代休記録の取得に失敗しました' } },
        { status: 500 }
      );
    }

    const compensatoryLeaveCount = compensatoryRecords?.length ?? 0;

    // 6ヶ月以内社員休暇の件数を取得。この休暇も休日出勤で埋める必要があるため、
    // その件数分だけ休日出勤が消費される（特定の日には紐づかないので件数として差し引く）。
    const { count: newEmployeeLeaveCount, error: nelError } = await supabase
      .from('attendance_records')
      .select('id', { count: 'exact', head: true })
      .eq('staff_id', staff.id)
      .eq('leave_type', 'new_employee_leave');

    if (nelError) {
      console.error('6ヶ月以内社員休暇取得エラー:', nelError);
      return NextResponse.json(
        { success: false, error: { message: '6ヶ月以内社員休暇の取得に失敗しました' } },
        { status: 500 }
      );
    }

    // 休日出勤日を新しい順に展開（1日複数件も件数分展開）
    let availableDates: string[] = [];
    (holidayWorkRecords ?? []).forEach((rec) => {
      availableDates.push(rec.date as string);
    });

    // ① 紐付けのある代休は、その特定の休日出勤日を1件ずつ直接消化する。
    //    （例: 10/24代休 → 10/22休日出勤 のペアは 10/22 を候補から除外）
    //    これにより、ユーザーが相殺済みのペアが候補に出なくなる。
    let linkedCompCount = 0;
    (compensatoryRecords ?? []).forEach((rec) => {
      const linkedDate = rec.compensatory_leave_date as string | null;
      if (!linkedDate) return;
      const idx = availableDates.indexOf(linkedDate);
      if (idx !== -1) {
        availableDates.splice(idx, 1); // 紐付いた休日出勤を1件消化
        linkedCompCount += 1;
      }
    });

    // ② 紐付けのない代休 + 6ヶ月以内社員休暇の件数分は、古い休日出勤から消化する。
    //    availableDates は新しい順なので、末尾（古い方）から件数分を取り除く。
    const unlinkedCompCount = Math.max((compensatoryLeaveCount ?? 0) - linkedCompCount, 0);
    const consumedCount = unlinkedCompCount + (newEmployeeLeaveCount ?? 0);
    if (consumedCount > 0) {
      availableDates = availableDates.slice(
        0,
        Math.max(availableDates.length - consumedCount, 0)
      );
    }

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

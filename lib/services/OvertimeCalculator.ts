// 残業計算ロジック

import { isMonday, getHoursDifference, roundHours } from '../utils/date';

/**
 * 標準労働時間の定義
 */
interface StandardHours {
  start: string; // HH:MM形式
  end: string;   // HH:MM形式
  hours: number; // 標準労働時間（時間単位）
}

/**
 * 残業計算クラス
 */
export class OvertimeCalculator {
  // 休憩時間（時間単位）
  private static readonly BREAK_HOURS = 1;

  // 月曜日の標準労働時間
  private static readonly MONDAY_STANDARD: StandardHours = {
    start: '09:00',
    end: '18:00',
    hours: 8, // 9:00-18:00 = 9時間 - 休憩1時間 = 8時間
  };

  // 月曜以外の標準労働時間
  private static readonly OTHER_DAYS_STANDARD: StandardHours = {
    start: '09:30',
    end: '18:00',
    hours: 7.5, // 9:30-18:00 = 8.5時間 - 休憩1時間 = 7.5時間
  };

  /**
   * 標準労働時間を取得（月曜/その他の判定）
   * @param date 対象日付
   * @returns 標準労働時間の情報
   */
  getStandardHours(date: Date): StandardHours {
    if (isMonday(date)) {
      return OvertimeCalculator.MONDAY_STANDARD;
    }
    return OvertimeCalculator.OTHER_DAYS_STANDARD;
  }

  /**
   * 実労働時間を計算（休憩1時間を自動控除）
   * @param clockIn 出勤時刻
   * @param clockOut 退勤時刻
   * @returns 実労働時間（時間単位、小数点2桁）
   */
  calculateWorkHours(clockIn: Date, clockOut: Date): number {
    // 出勤から退勤までの経過時間
    const totalHours = getHoursDifference(clockIn, clockOut);
    
    // 休憩時間を控除
    const workHours = totalHours - OvertimeCalculator.BREAK_HOURS;
    
    // 負の値にならないようにする
    return roundHours(Math.max(0, workHours));
  }

  /**
   * 残業時間を計算
   * @param clockIn 出勤時刻
   * @param clockOut 退勤時刻
   * @returns 残業時間（時間単位、小数点2桁）
   */
  calculateOvertime(clockIn: Date, clockOut: Date): number {
    // 実労働時間を計算
    const workHours = this.calculateWorkHours(clockIn, clockOut);
    
    // 標準労働時間を取得
    const standardHours = this.getStandardHours(clockIn);
    
    // 残業時間 = 実労働時間 - 標準労働時間
    const overtime = workHours - standardHours.hours;
    
    // 残業がない場合は0を返す
    return roundHours(Math.max(0, overtime));
  }

  /**
   * 労働時間と残業時間を一度に計算
   * @param clockIn 出勤時刻
   * @param clockOut 退勤時刻
   * @returns 労働時間と残業時間
   */
  calculate(clockIn: Date, clockOut: Date): { workHours: number; overtime: number } {
    const workHours = this.calculateWorkHours(clockIn, clockOut);
    const overtime = this.calculateOvertime(clockIn, clockOut);
    
    return {
      workHours,
      overtime,
    };
  }

  /**
   * 半休の残業時間を計算
   * @param clockIn 出勤時刻
   * @param clockOut 退勤時刻
   * @param halfLeavePeriod 半休の時間帯（morning/afternoon）
   * @returns 労働時間と残業時間
   */
  calculateHalfLeave(
    clockIn: Date,
    clockOut: Date,
    halfLeavePeriod: 'morning' | 'afternoon'
  ): { workHours: number; overtime: number } {
    // 実労働時間を計算
    const workHours = this.calculateWorkHours(clockIn, clockOut);
    
    // 半休の標準労働時間を取得
    let standardHours: number;
    
    if (halfLeavePeriod === 'morning') {
      // 午前半休：14:00~18:00 = 4時間
      standardHours = 4;
    } else {
      // 午後半休：9:30~13:30（月曜は9:00~13:30）= 4時間
      standardHours = 4;
    }
    
    // 残業時間 = 実労働時間 - 標準労働時間
    const overtime = workHours - standardHours;
    
    return {
      workHours,
      overtime: roundHours(Math.max(0, overtime)),
    };
  }

  /**
   * 月間労働時間の期間を計算（前月16日〜当月15日）
   * @param referenceDate 基準日（この日を含む月間期間を計算）
   * @returns 期間の開始日と終了日
   */
  getMonthlyPeriod(referenceDate: Date): { start: Date; end: Date } {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth(); // 0-11
    const day = referenceDate.getDate();

    let periodStart: Date;
    let periodEnd: Date;

    if (day >= 16) {
      // 16日以降の場合：当月16日〜翌月15日
      periodStart = new Date(year, month, 16, 0, 0, 0, 0);
      periodEnd = new Date(year, month + 1, 15, 23, 59, 59, 999);
    } else {
      // 15日以前の場合：前月16日〜当月15日
      periodStart = new Date(year, month - 1, 16, 0, 0, 0, 0);
      periodEnd = new Date(year, month, 15, 23, 59, 59, 999);
    }

    return { start: periodStart, end: periodEnd };
  }

  /**
   * 祝日対応に基づく残業時間を計算
   * @param monthlyWorkHours 月間労働時間
   * @param isHolidayStaff 祝日対応スタッフかどうか
   * @returns 残業時間と閾値
   */
  calculateMonthlyOvertime(
    monthlyWorkHours: number,
    isHolidayStaff: boolean
  ): { overtime: number; threshold: number } {
    // 祝日対応スタッフ: 10時間超過で残業
    // 祝日対応でないスタッフ: 7時間超過で残業
    const threshold = isHolidayStaff ? 10 : 7;
    const overtime = monthlyWorkHours - threshold;

    return {
      overtime: roundHours(Math.max(0, overtime)),
      threshold,
    };
  }
}

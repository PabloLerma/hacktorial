const SATURDAY = 6,
  SUNDAY = 0,
  DEFAULT_CLOCK = [
    { clock_in: "9:00", clock_out: "13:00" },
    { clock_in: "14:00", clock_out: "18:00" },
  ];

export class Hacktorial {
  constructor(year, month, employee_id, clock = null, holidays = []) {
    this.clock = this.setClock(clock);
    this.year = year || new Date().getUTCFullYear();
    this.month = month || new Date().getMonth() + 1;
    this.holidays = holidays;
    this.employee_id = employee_id;
  }

  async build() {
    await this.getPeriod();

    return this;
  }

  help() {
    console.log(
      "================================HELP================================"
    );
    console.log("Usage:");
    console.log(
      "let hacktorial = new Hacktorial(year, month, employee_id, clock);"
    );
    console.log("await hacktorial.build()");
    console.log("await hacktorial.run()");
    console.log("Arguments:");
    console.log(
      "[OPTIONAL] Year  [Integer] e.g. 2019                 DEFAULT => current year"
    );
    console.log(
      "[OPTIONAL] Month [Integer] e.g. 11 (November)        DEFAULT => current month"
    );
    console.log("EmployeeID [Integer] e.g. 123456");
    console.log(
      "[OPTIONAL] Your schedule [Array of Hash]             DEFAULT =>"
    );
    console.log(DEFAULT_CLOCK);
    console.log(
      "[OPTIONAL] Holidays  [Array of Integers] e.g. [4, 5] DEFAULT => null"
    );
    console.log("Functions:");
    console.log("await run()\t - Post your shifts");
    console.log("await clean()\t - Clean your shifts");
    console.log(
      "====================================================================="
    );
  }

  async run() {
    if (!this.period_id) {
      console.log("Wait, period id not set!");
      console.log(`Check month: ${this.month} and year: ${this.year}.`);
    }

    await this.setWeekdaysInMonth();
  }

  async clean() {
    await this.removeShifts();
  }

  setClock(clock) {
    if (!clock) {
      return DEFAULT_CLOCK;
    }

    if (typeof clock !== "object") {
      throw Error("Clock format must be an object e.g. " + DEFAULT_CLOCK);
    }

    if (clock.length === undefined || clock.length == 0) {
      throw Error("Clock format must be a valid object e.g. " + DEFAULT_CLOCK);
    }

    clock.forEach((time) => {
      console.log("clock_in: " + time.clock_in);
      console.log("clock_out: " + time.clock_out);
    });

    this.clock = clock;
  }

  async getPeriod() {
    const response = await fetch(
      `https://api.factorialhr.com/attendance/periods?year=${this.year}&month=${this.month}`,
      { method: "GET", credentials: "include" }
    );
    const content = await response.text();
    let periods = JSON.parse(content);
    periods.forEach((period) => {
      if (
        period.employee_id == this.employee_id &&
        period.month == this.month &&
        period.year == this.year
      ) {
        if (period.state == "pending") {
          this.period_id = period.id;
        } else {
          console.log(
            `Hey! You cannot update this month, period is: ${period.state}`
          );
        }
      }
    });
  }

  async setWeekdaysInMonth() {
    let isCurrentMonth = new Date().getMonth() + 1 === this.month;
    let currentDay = new Date().getDate();
    let totalDaysInMonth = new Date(this.year, this.month, 0).getDate();
    let availableDaysInMonth = isCurrentMonth ? currentDay : totalDaysInMonth;

    for (let day = 1; day <= availableDaysInMonth; day++) {
      if (this.isWeekday(day)) {
        for (const time of this.clock) {
          if (!this.holidays.includes(day)) {
            await this.sendData(day, time.clock_in, time.clock_out);
          }
        }
      }
    }
  }

  isWeekday(day) {
    let weekday = new Date(this.year, this.month - 1, day).getDay();

    return weekday != SATURDAY && weekday != SUNDAY;
  }

  async sendData(day, clock_in, clock_out) {
    let params = {
      clock_in: clock_in,
      clock_out: clock_out,
      day: day,
      history: [],
      minutes: 0,
      observations: null,
      period_id: this.period_id,
    };
    await this.sendPost(params);
  }

  async sendPost(params) {
    const response = await fetch(
      "https://api.factorialhr.com/attendance/shifts",
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      }
    );
    const content = await response.text();
    console.log(
      `POST: { day: ${params.day}, month: ${this.month}, year: ${this.year}, time: { clock_in: ${params.clock_in}, clock_out: ${params.clock_out} }}`
    );
    console.log(content);
  }

  async removeShifts() {
    const response = await fetch(
      "https://api.factorialhr.com/attendance/shifts",
      { method: "GET", credentials: "include" }
    );
    const content = response.text();
    let shifts = JSON.parse(content);
    for (const shift of shifts) {
      if (shift.period_id == this.period_id) {
        console.log(`DELETE: ${shift}`);
        await fetch(
          `https://api.factorialhr.com/attendance/shifts/${shift.id}`,
          { method: "DELETE", credentials: "include" }
        );
      }
    }
  }
}

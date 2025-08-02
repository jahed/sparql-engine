// SPDX-License-Identifier: MIT
export function parseISO8601(dateString: string) {
  const matches =
    /(\d\d\d\d)-?(\d\d)-?(\d\d)T(\d\d):?(\d\d):?(\d\d(?:\.\d+)?)(Z|(?:[+-].*))?$/.exec(
      dateString
    );
  if (matches) {
    const [, year, month, day, hour, minute, second, timezone = ""] = matches;
    return {
      year,
      month,
      day,
      hour,
      minute,
      second,
      timezone,
    };
  }
  throw new Error("Invalid ISO 8601 string.");
}

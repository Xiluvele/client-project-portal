using System.Text;

namespace LethaboPortal.Api.Security;

// ------------------------------------------------------------
// Password rules for activation and password reset.
// ------------------------------------------------------------
// 1. At least 12 characters (and at most 128).
// 2. Not a common or easily guessed password, including simple
//    variations such as "Password123!" or "p@ssw0rd".
// 3. Not made of one repeated character or a plain sequence
//    such as "abcdefghijkl" or "123456789012".
// 4. Does not contain the person's own email name or name.
//
// The web and mobile apps repeat these checks for instant
// feedback, but this class is the one that cannot be bypassed.
public static class PasswordPolicy
{
    public const int MinLength = 12;
    public const int MaxLength = 128;

    private static readonly HashSet<string> Common = new(StringComparer.Ordinal)
    {
        "123456", "1234567", "12345678", "123456789", "1234567890", "0123456789",
        "111111", "000000", "121212", "123123", "654321", "112233", "123321",
        "password", "passw0rd", "pass", "passcode", "passphrase", "letmein",
        "welcome", "admin", "administrator", "root", "user", "login", "master",
        "qwerty", "qwertyuiop", "qwertyui", "asdfgh", "asdfghjkl", "zxcvbn",
        "zxcvbnm", "qazwsx", "1q2w3e", "1q2w3e4r", "1qaz2wsx", "azerty",
        "iloveyou", "monkey", "dragon", "football", "baseball", "superman",
        "batman", "sunshine", "princess", "shadow", "michael", "trustno1",
        "abc123", "abcdef", "abcd1234", "test", "testing", "test123", "guest",
        "default", "changeme", "secret", "hello", "freedom", "whatever",
        "lethabo", "portal", "lethaboportal", "lethabom", "lethabomsolutions",
        "clientportal", "projectportal", "company", "manager", "developer",
        "client", "summer", "winter", "spring", "autumn", "google", "gmail",
        "southafrica", "johannesburg", "capetown", "pretoria", "soweto",
    };

    // Returns every rule the password breaks. An empty list means
    // the password is acceptable.
    public static IReadOnlyList<string> Validate(string? password, params string?[] personal)
    {
        var errors = new List<string>();
        var value = password ?? "";

        if (value.Length < MinLength)
        {
            errors.Add($"Use at least {MinLength} characters.");
        }

        if (value.Length > MaxLength)
        {
            errors.Add($"Use no more than {MaxLength} characters.");
        }

        if (string.IsNullOrWhiteSpace(value))
        {
            return errors;
        }

        if (IsCommon(value))
        {
            errors.Add("That password is too common or easy to guess. Choose something less predictable.");
        }
        else if (IsRepetitiveOrSequential(value))
        {
            errors.Add("Do not use repeated characters or simple sequences such as aaaa or 123456.");
        }
        else if (ContainsPersonalInfo(value, personal))
        {
            errors.Add("Do not include your name or email address in the password.");
        }

        return errors;
    }

    // One sentence that is safe to show to the person.
    public static string Describe(IReadOnlyList<string> errors) =>
        "Password not accepted. " + string.Join(" ", errors);

    // Rule used by the requirements text on the screens.
    public static string Requirement =>
        $"At least {MinLength} characters. Avoid common passwords such as 123456, password or qwerty.";

    public static bool IsCommon(string password)
    {
        var lowered = password.ToLowerInvariant();
        var plain = Strip(lowered, substituteLookalikes: false);
        var leet = Strip(lowered, substituteLookalikes: true);

        foreach (var candidate in new[] { plain, leet })
        {
            if (candidate.Length == 0)
            {
                // Nothing but digits and symbols (e.g. 123456789012).
                return true;
            }

            if (Common.Contains(candidate) || IsRepeatedCommon(candidate))
            {
                return true;
            }
        }

        // Also reject the raw form, e.g. "admin123" or "123456".
        return Common.Contains(lowered) || Common.Contains(TrimTail(lowered));
    }

    // Swap look-alike characters (p@ssw0rd -> password) when asked, then
    // drop any leading or trailing non-letters (password2024! -> password).
    private static string Strip(string lowered, bool substituteLookalikes)
    {
        // Trim first so the digits in "P@ssw0rd2024!" are removed as
        // a suffix before they are mistaken for look-alike letters.
        var text = TrimEdges(lowered);
        if (substituteLookalikes)
        {
            text = TrimEdges(new string(text.Select(Lookalike).ToArray()));
        }

        return text;
    }

    private static string TrimEdges(string text) =>
        text.Trim().Trim(text.Where(ch => !char.IsLetter(ch)).Distinct().ToArray());

    private static string TrimTail(string text) =>
        text.TrimEnd(text.Where(ch => !char.IsLetter(ch)).Distinct().ToArray());

    private static char Lookalike(char ch) => ch switch
    {
        '0' => 'o', '1' => 'l', '3' => 'e', '4' => 'a', '5' => 's',
        '7' => 't', '8' => 'b', '@' => 'a', '$' => 's', '!' => 'i', '|' => 'l',
        _ => ch,
    };

    // "passwordpassword", "adminadminadmin"
    private static bool IsRepeatedCommon(string candidate)
    {
        for (var size = 3; size <= candidate.Length / 2; size++)
        {
            if (candidate.Length % size != 0)
            {
                continue;
            }

            var unit = candidate[..size];
            if (Common.Contains(unit) && string.Concat(Enumerable.Repeat(unit, candidate.Length / size)) == candidate)
            {
                return true;
            }
        }

        return false;
    }

    private static bool IsRepetitiveOrSequential(string password)
    {
        var lowered = password.ToLowerInvariant();

        // Fewer than 5 different characters is never a real password.
        if (lowered.Distinct().Count() < 5)
        {
            return true;
        }

        // A single run going up or down by one: abcdefghijkl, 987654321098.
        for (var step = -1; step <= 1; step += 2)
        {
            var run = true;
            for (var i = 1; i < lowered.Length; i++)
            {
                if (lowered[i] - lowered[i - 1] != step)
                {
                    run = false;
                    break;
                }
            }

            if (run)
            {
                return true;
            }
        }

        // Digits that wrap, such as 123456789012345 or 098765432109876.
        if (lowered.All(char.IsDigit))
        {
            const string up = "01234567890123456789";
            const string down = "98765432109876543210";
            if (up.Contains(lowered) || down.Contains(lowered))
            {
                return true;
            }
        }

        // Keyboard rows: qwertyuiopas, asdfghjklzxc
        foreach (var row in new[] { "qwertyuiopasdfghjklzxcvbnm", "mnbvcxzlkjhgfdsapoiuytrewq", "1234567890qwertyuiop" })
        {
            if (row.Contains(lowered))
            {
                return true;
            }
        }

        return false;
    }

    private static bool ContainsPersonalInfo(string password, string?[] personal)
    {
        var lowered = new string(password.ToLowerInvariant().Where(char.IsLetterOrDigit).ToArray());

        foreach (var item in personal)
        {
            if (string.IsNullOrWhiteSpace(item))
            {
                continue;
            }

            var text = item.Trim().ToLowerInvariant();
            var parts = new List<string>();

            var at = text.IndexOf('@');
            parts.Add(at > 0 ? text[..at] : text);
            parts.AddRange(text.Split(new[] { ' ', '.', '_', '-', '@' }, StringSplitOptions.RemoveEmptyEntries));

            foreach (var part in parts)
            {
                var clean = new string(part.Where(char.IsLetterOrDigit).ToArray());

                // Short pieces such as "van" or "m" would block too many passwords.
                if (clean.Length >= 4 && lowered.Contains(clean, StringComparison.Ordinal))
                {
                    return true;
                }
            }
        }

        return false;
    }
}

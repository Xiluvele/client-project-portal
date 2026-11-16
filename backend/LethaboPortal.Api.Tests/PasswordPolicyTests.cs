using LethaboPortal.Api.Security;
using Xunit;

namespace LethaboPortal.Api.Tests;

public class PasswordPolicyTests
{
    [Theory]
    [InlineData("")]
    [InlineData("short1!")]
    [InlineData("Abcdefg1!xy")] // 11 characters
    public void Rejects_passwords_shorter_than_12(string password)
    {
        Assert.NotEmpty(PasswordPolicy.Validate(password));
    }

    [Fact]
    public void Rejects_null_password()
    {
        Assert.NotEmpty(PasswordPolicy.Validate(null));
    }

    [Fact]
    public void Rejects_passwords_longer_than_128()
    {
        Assert.NotEmpty(PasswordPolicy.Validate(new string('a', 64) + "Zq7!" + new string('b', 64)));
    }

    [Theory]
    [InlineData("123456")]
    [InlineData("password")]
    [InlineData("qwerty")]
    [InlineData("admin123")]
    [InlineData("password123456")]
    [InlineData("Password1234!!")]
    [InlineData("P@ssw0rd2024!!")]
    [InlineData("qwertyuiop12")]
    [InlineData("Qwerty123456!")]
    [InlineData("admin1234567")]
    [InlineData("iloveyou2024!")]
    [InlineData("letmein123456")]
    [InlineData("passwordpassword")]
    [InlineData("123456789012")]
    [InlineData("000000000000")]
    [InlineData("aaaaaaaaaaaaaa")]
    [InlineData("abcdefghijkl")]
    [InlineData("987654321098")]
    public void Rejects_common_or_guessable_passwords(string password)
    {
        Assert.NotEmpty(PasswordPolicy.Validate(password));
    }

    [Fact]
    public void Rejects_password_containing_email_name()
    {
        Assert.NotEmpty(PasswordPolicy.Validate("thabo.mokoena-2026-xyz", "thabo.mokoena@example.com"));
    }

    [Theory]
    [InlineData("correct horse battery staple")]
    [InlineData("Mango-River-Lantern-47")]
    [InlineData("t7Kp!zQ2vLm9#x")]
    [InlineData("my dog eats blue cheese")]
    public void Accepts_strong_passwords(string password)
    {
        Assert.Empty(PasswordPolicy.Validate(password, "someone@example.com"));
    }

    [Fact]
    public void Accepts_exactly_12_character_strong_password()
    {
        Assert.Empty(PasswordPolicy.Validate("Tg4$kLw9!pQx"));
    }

    [Fact]
    public void Message_explains_what_to_fix()
    {
        var message = PasswordPolicy.Describe(PasswordPolicy.Validate("password"));
        Assert.Contains("12 characters", message);
        Assert.Contains("common", message);
    }
}

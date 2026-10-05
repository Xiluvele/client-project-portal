using LethaboPortal.Api.Domain;
using LethaboPortal.Api.Security;

namespace LethaboPortal.Api.Data;

public static class PortalDbSeeder
{
    public const string DemoPassword = "connect123";

    public static void Seed(PortalDbContext db)
    {
        if (db.Users.Any()) return;

        db.Clients.AddRange(
            Client("kunene", "Kunene Attorneys", "Thandi Kunene", "thandi@kunene.co.za"),
            Client("greenfield", "Greenfield Academy", "Peter Naidoo", "peter@greenfield.co.za"),
            Client("vuka", "Vuka Retail", "Lindiwe Ndlovu", "lindiwe@vukaretail.co.za"),
            Client("botlumelo", "Botlumelo Clinic", "Dr. Masego K.", "masego@botlumelo.co.za"),
            Client("northwind", "Northwind Logistics", "Johan Venter", "johan@northwind.co.za"),
            Client("sahara", "Sahara Foods", "Amina Yusuf", "amina@saharafoods.co.za"),
            Client("metrodental", "Metro Dental", "Dr. Claire Adams", "claire@metrodental.co.za"));

        db.TeamMembers.AddRange(
            Member("nk", "Naledi Khumalo", "Naledi K.", "Project Manager", "NK", "naledi@lethabom.co.za", true),
            Member("tm", "Thabo Molefe", "Thabo M.", "UI/UX Designer", "TM", "thabo@lethabom.co.za", true),
            Member("sd", "Sipho Dlamini", "Sipho D.", "Software Developer", "SD", "sipho@lethabom.co.za", true),
            Member("an", "Amahle Nkosi", "Amahle N.", "Software Developer", "AN", "amahle@lethabom.co.za", true),
            Member("lp", "Lerato Pule", "Lerato P.", "Graphic Designer", "LP", "lerato@lethabom.co.za", true),
            Member("km", "Karabo Mensah", "Karabo M.", "Content Creator", "KM", "karabo@lethabom.co.za", false));

        var passwordHash = PasswordHasher.Hash(DemoPassword);
        db.Users.AddRange(
            User("user-admin", "Boitumelo Sithole", "admin@lethabom.co.za", passwordHash, "administrator", null, null, "Administrator"),
            User("user-nk", "Naledi Khumalo", "naledi@lethabom.co.za", passwordHash, "manager", null, "nk", "Project Manager"),
            User("user-sipho", "Sipho Dlamini", "sipho@lethabom.co.za", passwordHash, "developer", null, "sd", "Software Developer"),
            User("user-thandi", "Thandi Kunene", "thandi@kunene.co.za", passwordHash, "client", "kunene", null, "Kunene Attorneys"),
            User("user-lindiwe", "Lindiwe Ndlovu", "lindiwe@vukaretail.co.za", passwordHash, "client", "vuka", null, "Vuka Retail"));

        db.SaveChanges();
    }

    private static ClientAccount Client(string id, string name, string contact, string email) =>
        new() { Id = id, Name = name, Contact = contact, Email = email };

    private static TeamMember Member(string id, string name, string shortName, string role, string initials, string email, bool allocated) =>
        new() { Id = id, Name = name, ShortName = shortName, Role = role, Initials = initials, Email = email, Allocated = allocated };

    private static PortalUser User(string id, string name, string email, string passwordHash, string role, string? clientId, string? memberId, string title) =>
        new()
        {
            Id = id,
            Name = name,
            Email = email,
            PasswordHash = passwordHash,
            Role = role,
            ClientId = clientId,
            MemberId = memberId,
            Title = title,
            Active = true,
        };
}

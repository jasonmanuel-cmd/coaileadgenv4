using System.Text.Json.Serialization;

namespace CoaiLeadMonitor.Models;

public class Lead
{
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("guid")] public string Guid { get; set; } = "";
    [JsonPropertyName("title")] public string Title { get; set; } = "";
    [JsonPropertyName("description")] public string? Description { get; set; }
    [JsonPropertyName("url")] public string Url { get; set; } = "";
    [JsonPropertyName("city")] public string City { get; set; } = "";
    [JsonPropertyName("cityLabel")] public string CityLabel { get; set; } = "";
    [JsonPropertyName("category")] public string Category { get; set; } = "";
    [JsonPropertyName("keywords")] public string Keywords { get; set; } = "[]";
    [JsonPropertyName("postedAt")] public string PostedAt { get; set; } = "";
    [JsonPropertyName("fetchedAt")] public string FetchedAt { get; set; } = "";
    [JsonPropertyName("isRead")] public bool IsRead { get; set; }
    [JsonPropertyName("isSaved")] public bool IsSaved { get; set; }
    [JsonPropertyName("isContacted")] public bool IsContacted { get; set; }
    [JsonPropertyName("score")] public int Score { get; set; } = 5;

    public List<string> KeywordList =>
        System.Text.Json.JsonSerializer.Deserialize<List<string>>(Keywords) ?? new();

    public string ScoreLabel => Score switch
    {
        >= 8 => "HOT",
        >= 5 => "WARM",
        _ => "COLD"
    };

    public string TimeAgo
    {
        get
        {
            if (!DateTime.TryParse(PostedAt, out var dt)) return "";
            var span = DateTime.UtcNow - dt.ToUniversalTime();
            if (span.TotalMinutes < 60) return $"{(int)span.TotalMinutes}m ago";
            if (span.TotalHours < 24) return $"{(int)span.TotalHours}h ago";
            return $"{(int)span.TotalDays}d ago";
        }
    }
}

public class LeadsResponse
{
    [JsonPropertyName("leads")] public List<Lead> Leads { get; set; } = new();
    [JsonPropertyName("total")] public int Total { get; set; }
}

public class StatsResponse
{
    [JsonPropertyName("total")] public int Total { get; set; }
    [JsonPropertyName("unread")] public int Unread { get; set; }
    [JsonPropertyName("saved")] public int Saved { get; set; }
    [JsonPropertyName("contacted")] public int Contacted { get; set; }
    [JsonPropertyName("newToday")] public int NewToday { get; set; }
    [JsonPropertyName("byCity")] public Dictionary<string, int> ByCity { get; set; } = new();
    [JsonPropertyName("isFetching")] public bool IsFetching { get; set; }
    [JsonPropertyName("lastFetched")] public string? LastFetched { get; set; }
    [JsonPropertyName("newLastFetch")] public int NewLastFetch { get; set; }
    [JsonPropertyName("cities")] public List<CityInfo>? Cities { get; set; }
    [JsonPropertyName("browserEnabled")] public bool BrowserEnabled { get; set; }
}

public class CityInfo
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("label")] public string Label { get; set; } = "";
}

public class ScanStatusResponse
{
    [JsonPropertyName("status")] public string Status { get; set; } = "";
}

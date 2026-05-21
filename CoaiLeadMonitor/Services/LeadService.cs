using System.Net.Http.Json;
using CoaiLeadMonitor.Models;

namespace CoaiLeadMonitor.Services;

public class LeadService : ILeadService
{
    private readonly HttpClient _http;

    public LeadService(HttpClient http)
    {
        _http = http;
    }

    public async Task<LeadsResponse> GetLeadsAsync(string? city = null, string? keyword = null,
        string? status = null, int page = 1, int limit = 50)
    {
        var q = new List<string>();
        if (!string.IsNullOrEmpty(city) && city != "all") q.Add($"city={Uri.EscapeDataString(city)}");
        if (!string.IsNullOrEmpty(keyword)) q.Add($"keyword={Uri.EscapeDataString(keyword)}");
        if (!string.IsNullOrEmpty(status)) q.Add($"status={Uri.EscapeDataString(status)}");
        q.Add($"page={page}");
        q.Add($"limit={limit}");

        var url = $"/api/leads?{string.Join("&", q)}";
        var resp = await _http.GetFromJsonAsync<LeadsResponse>(url);
        return resp ?? new LeadsResponse();
    }

    public async Task<StatsResponse> GetStatsAsync()
    {
        var resp = await _http.GetFromJsonAsync<StatsResponse>("/api/stats");
        return resp ?? new StatsResponse();
    }

    public async Task<Lead?> UpdateLeadAsync(int id, bool? isRead = null, bool? isSaved = null, bool? isContacted = null)
    {
        var body = new Dictionary<string, object>();
        if (isRead.HasValue) body["isRead"] = isRead.Value;
        if (isSaved.HasValue) body["isSaved"] = isSaved.Value;
        if (isContacted.HasValue) body["isContacted"] = isContacted.Value;

        var resp = await _http.PatchAsJsonAsync($"/api/leads/{id}", body);
        resp.EnsureSuccessStatusCode();
        return await resp.Content.ReadFromJsonAsync<Lead>();
    }

    public async Task<bool> DeleteLeadAsync(int id)
    {
        var resp = await _http.DeleteAsync($"/api/leads/{id}");
        return resp.IsSuccessStatusCode;
    }

    public async Task<bool> TriggerScanAsync()
    {
        var resp = await _http.PostAsync("/api/fetch", null);
        return resp.IsSuccessStatusCode;
    }
}

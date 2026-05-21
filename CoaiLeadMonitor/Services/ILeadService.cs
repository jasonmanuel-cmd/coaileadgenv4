using CoaiLeadMonitor.Models;

namespace CoaiLeadMonitor.Services;

public interface ILeadService
{
    Task<LeadsResponse> GetLeadsAsync(string? city = null, string? keyword = null,
        string? status = null, int page = 1, int limit = 50);
    Task<StatsResponse> GetStatsAsync();
    Task<Lead?> UpdateLeadAsync(int id, bool? isRead = null, bool? isSaved = null, bool? isContacted = null);
    Task<bool> DeleteLeadAsync(int id);
    Task<bool> TriggerScanAsync();
}

using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace CoaiLeadMonitor.Services;

public class ScanWebSocket : IDisposable
{
    private readonly string _wsUrl;
    private ClientWebSocket? _ws;
    private CancellationTokenSource? _cts;
    private bool _disposed;

    public event Action? OnScanCompleted;

    public ScanWebSocket(string baseUrl)
    {
        _wsUrl = baseUrl.Replace("http://", "ws://").Replace("https://", "wss://") + "/ws";
    }

    public async Task ConnectAsync()
    {
        _cts = new CancellationTokenSource();
        _ws = new ClientWebSocket();
        try
        {
            await _ws.ConnectAsync(new Uri(_wsUrl), _cts.Token);
            _ = ReceiveLoopAsync(_cts.Token);
        }
        catch
        {
            _ = ReconnectAsync();
        }
    }

    private async Task ReceiveLoopAsync(CancellationToken ct)
    {
        var buf = new byte[4096];
        try
        {
            while (_ws?.State == WebSocketState.Open && !ct.IsCancellationRequested)
            {
                var result = await _ws.ReceiveAsync(new ArraySegment<byte>(buf), ct);
                if (result.MessageType == WebSocketMessageType.Close)
                {
                    await _ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "", CancellationToken.None);
                    break;
                }
                var json = Encoding.UTF8.GetString(buf, 0, result.Count);
                var msg = JsonSerializer.Deserialize<WsMessage>(json);
                if (msg?.Type == "scan-complete")
                    OnScanCompleted?.Invoke();
            }
        }
        catch { }
        if (!ct.IsCancellationRequested)
            _ = ReconnectAsync();
    }

    private async Task ReconnectAsync()
    {
        await Task.Delay(5000);
        if (!_disposed) await ConnectAsync();
    }

    public void Dispose()
    {
        _disposed = true;
        _cts?.Cancel();
        _ws?.Dispose();
        _cts?.Dispose();
    }

    private class WsMessage
    {
        public string Type { get; set; } = "";
        public int NewCount { get; set; }
        public string Timestamp { get; set; } = "";
    }
}

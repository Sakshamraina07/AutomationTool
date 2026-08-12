import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';

// Emails sent vs replies received per day (§9).
export default function TimelineChart({ data }) {
  if (!data.length) {
    return <div className="empty">No activity yet.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
        <CartesianGrid stroke="#262f42" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" stroke="#66708a" fontSize={11} tickLine={false} />
        <YAxis stroke="#66708a" fontSize={11} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#141926', border: '1px solid #262f42', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#e6e9f0' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="sent" name="Sent" stroke="#6ea8fe" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="replied" name="Replies" stroke="#4ade80" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

package com.example.smtts.ui.history

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.smtts.R
import com.example.smtts.data.model.CheckinEvent

class HistoryAdapter : RecyclerView.Adapter<HistoryAdapter.ViewHolder>() {

    private var items: List<CheckinEvent> = emptyList()

    fun submitList(newItems: List<CheckinEvent>) {
        items = newItems
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_history, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(items[position])
    }

    override fun getItemCount() = items.size

    class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvDate = itemView.findViewById<TextView>(R.id.tvEventDate)
        private val tvStatus = itemView.findViewById<TextView>(R.id.tvEventStatus)
        private val tvTime = itemView.findViewById<TextView>(R.id.tvEventTime)
        private val tvDetail1 = itemView.findViewById<TextView>(R.id.tvEventDetail1)
        private val tvDetail2 = itemView.findViewById<TextView>(R.id.tvEventDetail2)

        fun bind(event: CheckinEvent) {
            val ctx = itemView.context

            // Date - extract dd/MM from createdAt
            val dateStr = try {
                val parts = event.createdAt.substring(0, 10).split("-")
                "${parts[2]}/${parts[1]}"
            } catch (_: Exception) { event.createdAt }
            tvDate.text = dateStr

            // Time
            val time = try {
                event.createdAt.substring(11, 16)
            } catch (_: Exception) { "" }

            // Status icon + text
            when (event.result) {
                "SUCCESS" -> {
                    tvStatus.text = ctx.getString(R.string.history_status_success)
                    tvStatus.setTextColor(ctx.getColor(R.color.smtts_green_700))
                    tvTime.text = time
                }
                "WARNING" -> {
                    tvStatus.text = ctx.getString(R.string.history_status_late)
                    tvStatus.setTextColor(ctx.getColor(R.color.smtts_amber_600))
                    tvTime.text = "$time (${ctx.getString(R.string.history_late)})"
                }
                "FAILED" -> {
                    tvStatus.text = ctx.getString(R.string.history_status_missed)
                    tvStatus.setTextColor(ctx.getColor(R.color.smtts_red_600))
                    tvTime.text = ctx.getString(R.string.history_no_checkin)
                }
                else -> {
                    tvStatus.text = event.result
                    tvStatus.setTextColor(ctx.getColor(R.color.smtts_zinc_500))
                    tvTime.text = time
                }
            }

            // Geofence detail
            tvDetail1.visibility = View.GONE
            if (event.inGeofence != null) {
                tvDetail1.visibility = View.VISIBLE
                tvDetail1.text = if (event.inGeofence) {
                    ctx.getString(R.string.history_in_geofence)
                } else {
                    ctx.getString(R.string.history_out_geofence)
                }
                tvDetail1.setTextColor(
                    if (event.inGeofence) ctx.getColor(R.color.smtts_green_700)
                    else ctx.getColor(R.color.smtts_red_600)
                )
            }

            // Face match detail
            tvDetail2.visibility = View.GONE
            if (event.faceMatchScore != null && event.faceMatchScore > 0) {
                tvDetail2.visibility = View.VISIBLE
                tvDetail2.text = ctx.getString(R.string.history_face_match)
                tvDetail2.setTextColor(ctx.getColor(R.color.smtts_green_700))
            }
        }
    }
}

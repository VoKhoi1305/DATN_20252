package com.example.smtts.ui.notification

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.smtts.R
import com.example.smtts.data.model.AppNotification

class NotificationAdapter(
    private val onItemClick: (AppNotification) -> Unit
) : RecyclerView.Adapter<NotificationAdapter.ViewHolder>() {

    private var items: List<AppNotification> = emptyList()

    fun submitList(newItems: List<AppNotification>) {
        items = newItems
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_notification, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(items[position])
    }

    override fun getItemCount() = items.size

    inner class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvIcon = itemView.findViewById<TextView>(R.id.tvNotifIcon)
        private val tvTitle = itemView.findViewById<TextView>(R.id.tvNotifTitle)
        private val tvMessage = itemView.findViewById<TextView>(R.id.tvNotifMessage)
        private val tvTime = itemView.findViewById<TextView>(R.id.tvNotifTime)
        private val unreadDot = itemView.findViewById<View>(R.id.unreadDot)
        private val cardRoot = itemView.findViewById<View>(R.id.cardNotification)

        fun bind(notification: AppNotification) {
            val ctx = itemView.context

            // Icon based on type
            tvIcon.text = when (notification.type) {
                "CHECKIN_REMINDER" -> "🔵"
                "CHECKIN_OVERDUE" -> "🔴"
                "REQUEST_APPROVED" -> "✅"
                "REQUEST_REJECTED" -> "❌"
                "GEOFENCE_WARNING" -> "⚠️"
                "SYSTEM_MESSAGE" -> "📢"
                "OFFICER_MESSAGE" -> "💬"
                else -> "📋"
            }

            tvTitle.text = notification.title
            tvMessage.text = notification.message

            // Time - extract HH:mm from createdAt
            tvTime.text = try {
                notification.createdAt.substring(11, 16)
            } catch (_: Exception) { "" }

            // Unread indicator
            unreadDot.visibility = if (!notification.isRead) View.VISIBLE else View.GONE
            cardRoot.alpha = if (notification.isRead) 0.7f else 1.0f

            itemView.setOnClickListener { onItemClick(notification) }
        }
    }
}

package com.example.smtts.ui.request

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.smtts.R
import com.example.smtts.data.model.SubjectRequest

class RequestAdapter : RecyclerView.Adapter<RequestAdapter.ViewHolder>() {

    private var items: List<SubjectRequest> = emptyList()

    fun submitList(newItems: List<SubjectRequest>) {
        items = newItems
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_request, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(items[position])
    }

    override fun getItemCount() = items.size

    class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvIcon = itemView.findViewById<TextView>(R.id.tvRequestIcon)
        private val tvType = itemView.findViewById<TextView>(R.id.tvRequestType)
        private val tvDate = itemView.findViewById<TextView>(R.id.tvRequestDate)
        private val tvStatus = itemView.findViewById<TextView>(R.id.tvRequestStatus)
        private val tvReason = itemView.findViewById<TextView>(R.id.tvRequestReason)
        private val tvReviewNote = itemView.findViewById<TextView>(R.id.tvReviewNote)

        fun bind(request: SubjectRequest) {
            val ctx = itemView.context

            // Type display
            val typeInfo = getTypeInfo(ctx, request.type)
            tvIcon.text = typeInfo.first
            tvType.text = typeInfo.second

            // Date
            tvDate.text = try {
                val parts = request.createdAt.substring(0, 10).split("-")
                ctx.getString(R.string.request_sent_date, "${parts[2]}/${parts[1]}/${parts[0]}")
            } catch (_: Exception) { request.createdAt }

            // Status
            when (request.status) {
                "PENDING" -> {
                    tvStatus.text = ctx.getString(R.string.request_status_pending)
                    tvStatus.setTextColor(ctx.getColor(R.color.smtts_amber_600))
                }
                "APPROVED" -> {
                    tvStatus.text = ctx.getString(R.string.request_status_approved)
                    tvStatus.setTextColor(ctx.getColor(R.color.smtts_green_700))
                }
                "REJECTED" -> {
                    tvStatus.text = ctx.getString(R.string.request_status_rejected)
                    tvStatus.setTextColor(ctx.getColor(R.color.smtts_red_600))
                }
                else -> {
                    tvStatus.text = request.status
                    tvStatus.setTextColor(ctx.getColor(R.color.smtts_zinc_500))
                }
            }

            // Reason (brief)
            tvReason.text = request.reason
            tvReason.visibility = if (request.reason.isNotBlank()) View.VISIBLE else View.GONE

            // Review note (for rejected)
            if (request.status == "REJECTED" && !request.reviewNote.isNullOrBlank()) {
                tvReviewNote.text = ctx.getString(R.string.request_review_note, request.reviewNote)
                tvReviewNote.visibility = View.VISIBLE
            } else {
                tvReviewNote.visibility = View.GONE
            }
        }

        private fun getTypeInfo(ctx: android.content.Context, type: String): Pair<String, String> {
            return when (type) {
                "TRAVEL" -> "✈️" to ctx.getString(R.string.request_type_travel)
                "POSTPONE" -> "⏸️" to ctx.getString(R.string.request_type_postpone)
                "CHANGE_DEVICE" -> "📱" to ctx.getString(R.string.request_type_change_device)
                "CHANGE_ADDRESS" -> "🏠" to ctx.getString(R.string.request_type_change_address)
                else -> "📋" to type
            }
        }
    }
}

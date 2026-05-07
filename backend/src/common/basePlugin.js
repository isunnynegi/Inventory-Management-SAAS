import mongoose from "mongoose";

export const basePlugin = (schema) => {
  schema.add({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  });

  const softFilter = function() {
    if (!this._conditions.hasOwnProperty("isDeleted")) this.where({ isDeleted: false });
  };
  schema.pre("find", softFilter);
  schema.pre("findOne", softFilter);
  schema.pre("findOneAndUpdate", softFilter);
  schema.pre("countDocuments", softFilter);

  schema.methods.softDelete = async function(userId) {
    this.isDeleted = true; this.deletedAt = new Date(); this.deletedBy = userId;
    return this.save();
  };

  schema.statics.findByOrg = function(organizationId, filter = {}) {
    return this.find({ organizationId, ...filter });
  };

  schema.set("toJSON", {
    virtuals: true,
    transform: (_d, ret) => {
      ret.id = ret._id; delete ret._id; delete ret.__v;
      delete ret.isDeleted; delete ret.deletedAt;
      return ret;
    }
  });
  schema.set("toObject", { virtuals: true });
};

import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        email: {
            type: String,
            lowercase: true,
            trim: true,
        },
        referralCode: {
            type: String,
            unique: true,
            uppercase: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

employeeSchema.pre("save", async function (next) {
    if (!this.isNew) return next();
    if (this.referralCode) return next();

    try {
        const lastEmployee = await this.constructor.findOne({}, {}, { sort: { createdAt: -1 } });
        let nextNumber = 1;
        if (lastEmployee && lastEmployee.referralCode && lastEmployee.referralCode.startsWith("EMP")) {
            const lastNumberStr = lastEmployee.referralCode.replace("EMP", "");
            const lastNumber = parseInt(lastNumberStr, 10);
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }
        
        this.referralCode = `EMP${nextNumber.toString().padStart(3, "0")}`;
        
        let isUnique = false;
        while (!isUnique) {
            const existing = await this.constructor.findOne({ referralCode: this.referralCode });
            if (existing) {
                nextNumber++;
                this.referralCode = `EMP${nextNumber.toString().padStart(3, "0")}`;
            } else {
                isUnique = true;
            }
        }

        next();
    } catch (error) {
        next(error);
    }
});

export default mongoose.model("Employee", employeeSchema);

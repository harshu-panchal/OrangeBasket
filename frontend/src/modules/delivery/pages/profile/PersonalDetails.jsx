import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, User, Mail, Phone, MapPin, Calendar, Droplet, Camera, Image as ImageIcon } from "lucide-react";
import Button from "@/shared/components/ui/Button";
import Input from "@/shared/components/ui/Input";
import { toast } from "sonner";
import { useAuth } from "@core/context/AuthContext";
import { deliveryApi } from "../../services/deliveryApi"; // Assuming standard structure

const PersonalDetails = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const { user, updateUser } = useAuth();
  const [previewImage, setPreviewImage] = useState(user?.profileImage || user?.avatar || "/placeholder-avatar.png");
  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    phone: user?.phone || user?.mobile || "",
    email: user?.email || "",
    address: user?.address || "",
    dob: user?.dob ? new Date(user.dob).toISOString().split('T')[0] : "",
    bloodGroup: user?.bloodGroup || "",
    profileImage: user?.profileImage || user?.avatar || "",
  });

  // Update if user loads later
  React.useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.name || "",
        phone: user.phone || user.mobile || "",
        email: user.email || "",
        address: user.address || "",
        dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : "",
        bloodGroup: user.bloodGroup || "",
        profileImage: user.profileImage || user.avatar || "",
      });
      setPreviewImage(user.profileImage || user.avatar || "/placeholder-avatar.png");
    }
  }, [user]);

  const handleImageClick = async () => {
    if (!isEditing) return;
    
    try {
      if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
        const result = await window.flutter_inappwebview.callHandler('openCamera');
        if (result && result.success) {
          const fileUrl = `data:${result.mimeType};base64,${result.base64}`;
          setPreviewImage(fileUrl);
          setFormData(prev => ({ ...prev, profileImage: fileUrl }));
        } else {
          toast.error("Failed to capture image from camera");
        }
      } else {
        // Web fallback
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setPreviewImage(event.target.result);
              setFormData(prev => ({ ...prev, profileImage: event.target.result }));
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast.error("An error occurred while opening the camera");
    }
  };

  const handleGalleryClick = async () => {
    if (!isEditing) return;
    
    try {
      if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
        const result = await window.flutter_inappwebview.callHandler('openGallery');
        if (result && result.success) {
          const fileUrl = `data:${result.mimeType};base64,${result.base64}`;
          setPreviewImage(fileUrl);
          setFormData(prev => ({ ...prev, profileImage: fileUrl }));
        } else {
          toast.error("Failed to capture image from gallery");
        }
      } else {
        // Web fallback
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setPreviewImage(event.target.result);
              setFormData(prev => ({ ...prev, profileImage: event.target.result }));
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
    } catch (error) {
      console.error("Gallery error:", error);
      toast.error("An error occurred while opening the gallery");
    }
  };

  const handleSave = async () => {
    try {
        if (deliveryApi && deliveryApi.updateProfile) {
            const payload = { ...formData };
            // Prevent duplicate key error for empty email in MongoDB
            if (!payload.email || payload.email.trim() === '') {
                delete payload.email;
            }
            
            const response = await deliveryApi.updateProfile(payload);
            const updatedUser = response.data?.result || response.data;
            if (updateUser && updatedUser) {
              updateUser(updatedUser);
            }
        }
        setIsEditing(false);
        toast.success("Personal details updated successfully!");
    } catch (error) {
        toast.error("Failed to update details");
    }
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center p-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 rounded-full hover:bg-gray-100 transition-colors mr-2"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="ds-h3 text-gray-900">Personal Details</h1>
          <div className="ml-auto">
            {isEditing ? (
              <Button size="sm" onClick={handleSave} className="h-8 px-3">
                Save
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsEditing(true)} 
                className="text-primary hover:bg-primary/5"
              >
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {/* Profile Photo */}
        <div className="flex flex-col items-center justify-center py-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full p-1 bg-white shadow-md">
              <img
                src={previewImage}
                alt="Profile"
                className="w-full h-full rounded-full object-cover bg-gray-100"
              />
            </div>
            {isEditing && (
              <>
                <button type="button" onClick={handleImageClick} className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1.5 rounded-full shadow-lg hover:bg-primary/90 transition-colors" title="Camera">
                  <Camera size={14} />
                </button>
                <button type="button" onClick={handleGalleryClick} className="absolute bottom-0 left-0 bg-blue-500 text-white p-1.5 rounded-full shadow-lg hover:bg-blue-600 transition-colors" title="Gallery">
                  <ImageIcon size={14} />
                </button>
              </>
            )}
          </div>
          <p className="mt-3 text-sm text-gray-500">Delivery Partner ID: {user?.deliveryBoyId || user?._id?.slice(-6) || "N/A"}</p>
        </div>

        {/* Form Fields */}
        <div className="space-y-4 bg-white p-4 rounded-xl shadow-sm">
          <Input
            label="Full Name"
            value={formData.fullName}
            readOnly={!isEditing}
            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            icon={User}
            className={!isEditing ? "bg-gray-50 border-transparent" : ""}
          />
          
          <Input
            label="Phone Number"
            value={formData.phone}
            readOnly={true} // Phone is usually locked
            icon={Phone}
            className="bg-gray-50 border-transparent text-gray-500"
            helperText="Contact support to change phone number"
          />

          <Input
            label="Email Address"
            value={formData.email}
            readOnly={!isEditing}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            icon={Mail}
            type="email"
            className={!isEditing ? "bg-gray-50 border-transparent" : ""}
          />

          <div className="relative">
            <label className="block text-xs font-medium text-gray-700 mb-1 ml-1">Current Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <MapPin size={18} />
              </div>
              <textarea
                value={formData.address}
                readOnly={!isEditing}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className={`w-full pl-10 pr-4 py-2 rounded-xl text-sm border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none ${
                  !isEditing ? "bg-gray-50 border-transparent text-gray-600" : "bg-white border-gray-200"
                }`}
                rows={3}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date of Birth"
              value={formData.dob}
              readOnly={true}
              icon={Calendar}
              className="bg-gray-50 border-transparent"
            />
            <Input
              label="Blood Group"
              value={formData.bloodGroup}
              readOnly={!isEditing}
              onChange={(e) => setFormData({...formData, bloodGroup: e.target.value})}
              icon={Droplet}
              className={!isEditing ? "bg-gray-50 border-transparent" : ""}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalDetails;

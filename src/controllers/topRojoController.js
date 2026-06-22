import mongoose from "mongoose";
import TopRojo from "../models/TopRojo.js";
import Profile from "../models/profile.js";
import Stripe from "stripe";
import { getRequestCountry, isCountryBlocked } from "../middlewares/geoBlocking.js";
import { notifyAdmin } from "../utils/notification.js";
import { normalizeExpiredTopRojos } from "../services/topRojoStatusService.js";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

// Plan pricing and duration
const PLANS = {
  top_24h: { price: 2999, hours: 24 }, // $29.99
  top_3d: { price: 6999, hours: 72 }, // $69.99
  top_7d: { price: 12999, hours: 168 } // $129.99
};

// POST /api/profiles/top-rojo/create
export const createTopRojo = async (req, res) => {
  try {
    const {
      profileId,
      planType,
      city,
      country,
      title,
      description,
      contactPhone,
      images,
      status = "pending"
    } = req.body;
    const allowedStatuses = ["pending", "active"];

    // Validate required fields
    if (!profileId || !planType || !city || !country || !title || !description || !contactPhone || !images) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // Validate plan type
    if (!PLANS[planType]) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan type"
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Allowed values: pending, active"
      });
    }

    // Check if profile exists and get userId
    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    const requestCountry = getRequestCountry(req);
    if (requestCountry && isCountryBlocked(requestCountry, profile.blockedCountries)) {
      return res.status(403).json({
        success: false,
        message: "No se puede crear o acceder a este contenido desde tu país"
      });
    }

    const userId = profile.objectId;

    await normalizeExpiredTopRojos();

    // Check if user already has an active top-rojo for this city
    const existingTopRojo = await TopRojo.findOne({
      userId,
      city,
      country,
      status: "active"
    });

    if (existingTopRojo) {
      return res.status(400).json({
        success: false,
        message: "User already has an active top-rojo for this city"
      });
    }

    // Calculate end date
    const now = new Date();
    const endDate = new Date(now.getTime() + PLANS[planType].hours * 60 * 60 * 1000);

    let paymentUrl = null;
    let paymentId = null;

    if (status === "active") {
      try {
        const paymentIntent = await getStripe().paymentIntents.create({
          amount: PLANS[planType].price,
          currency: "usd",
          metadata: {
            profileId,
            userId,
            planType,
            city,
            country,
            status
          }
        });
        paymentId = paymentIntent.id;
        paymentUrl = `${process.env.FRONTEND_URL}/checkout?clientSecret=${paymentIntent.client_secret}`;
      } catch (stripeError) {
        return res.status(500).json({
          success: false,
          message: "Payment processing failed",
          error: stripeError.message
        });
      }
    }

    const topRojo = new TopRojo({
      profileId,
      userId,
      planType,
      city,
      country,
      title,
      description,
      contactPhone,
      images,
      endDate,
      paymentId,
      status
    });

    await topRojo.save();

    await notifyAdmin({
      type: "top_rojo",
      title: status === "active" ? "Top Rojo activado" : "Top Rojo pendiente",
      message: status === "active"
        ? `Se creo Top Rojo ${planType} en estado activo para perfil ${profileId}`
        : `Se creo Top Rojo ${planType} en estado pendiente para perfil ${profileId}`,
      targetId: topRojo._id,
      meta: { profileId, planType, userId, status }
    });

    // Populate profile info for response
    const response = {
      success: true,
      topRojo: {
        id: topRojo._id,
        profileId: topRojo.profileId,
        planType: topRojo.planType,
        city: topRojo.city,
        country: topRojo.country,
        title: topRojo.title,
        description: topRojo.description,
        contactPhone: topRojo.contactPhone,
        images: topRojo.images,
        startDate: topRojo.startDate,
        endDate: topRojo.endDate,
        viewCount: topRojo.viewCount,
        clickCount: topRojo.clickCount,
        status: topRojo.status,
        position: topRojo.position
      }
    };

    if (paymentUrl) {
      response.paymentUrl = paymentUrl;
    }

    res.status(201).json(response);
  } catch (error) {
    console.error("Error creating top-rojo:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// GET /api/profiles/top-rojo/user/:userId/my-tops
export const getMyTops = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    await normalizeExpiredTopRojos();

    const myTops = await TopRojo.find({ userId });

    // Categorize tops
    const activeTops = myTops.filter(top => top.status === "active" && new Date(top.endDate) > new Date());
    const pendingTops = myTops.filter(top => top.status === "pending");
    const expiredTops = myTops.filter(top => top.status === "expired" || new Date(top.endDate) <= new Date());
    const cancelledTops = myTops.filter(top => top.status === "cancelled");

    const mapTop = (top) => ({
      id: top._id,
      title: top.title,
      description: top.description,
      contactPhone: top.contactPhone,
      images: top.images,
      planType: top.planType,
      city: top.city,
      country: top.country,
      status: top.status,
      startDate: top.startDate,
      endDate: top.endDate,
      viewCount: top.viewCount,
      clickCount: top.clickCount,
      position: top.position,
      createdAt: top.createdAt
    });

    const dashboard = {
      success: true,
      stats: {
        totalTops: myTops.length,
        activeTops: activeTops.length,
        pendingTops: pendingTops.length,
        expiredTops: expiredTops.length,
        cancelledTops: cancelledTops.length,
        totalViews: myTops.reduce((sum, top) => sum + top.viewCount, 0),
        totalClicks: myTops.reduce((sum, top) => sum + top.clickCount, 0)
      },
      activeTops: activeTops.map(mapTop),
      pendingTops: pendingTops.map(mapTop),
      expiredTops: expiredTops.map(mapTop)
    };

    res.status(200).json(dashboard);
  } catch (error) {
    console.error("Error fetching user tops:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// GET /api/profiles/top-rojo/all
export const getAllTops = async (req, res) => {
  try {
    await normalizeExpiredTopRojos();

    const requestCountry = getRequestCountry(req);
    const tops = await TopRojo.find({
      status: "active",
      endDate: { $gt: new Date() }
    })
      .sort({ position: 1, createdAt: -1 })
      .populate({
        path: "profileId",
        select: "blockedCountries isActiveProfile"
      });

    const visibleTops = requestCountry
      ? tops.filter((top) => {
          const profile = top.profileId;
          return profile && profile.isActiveProfile !== false && !isCountryBlocked(requestCountry, profile.blockedCountries);
        })
      : tops.filter((top) => top.profileId && top.profileId.isActiveProfile !== false);

    res.status(200).json({
      success: true,
      total: visibleTops.length,
      tops: visibleTops.map(top => ({
        id: top._id,
        profileId: top.profileId,
        title: top.title,
        description: top.description,
        contactPhone: top.contactPhone,
        images: top.images,
        planType: top.planType,
        city: top.city,
        country: top.country,
        position: top.position,
        viewCount: top.viewCount,
        clickCount: top.clickCount,
        endDate: top.endDate
      }))
    });
  } catch (error) {
    console.error("Error fetching all tops:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// GET /api/profiles/top-rojo/city/:city/:country
export const getTopRojoByCity = async (req, res) => {
  try {
    const { city, country } = req.params;

    await normalizeExpiredTopRojos();

    const requestCountry = getRequestCountry(req);

    // Get active tops for this city ordered by position
    const tops = await TopRojo.find({
      city,
      country,
      status: "active",
      endDate: { $gt: new Date() }
    })
      .populate({
        path: "profileId",
        match: { isActiveProfile: true }
      })
      .sort({ position: 1, createdAt: -1 });

    // Filtrar los Tops donde el perfil haya quedado nulo (porque no está activo)
    const activeTops = tops.filter(top => top.profileId !== null);

    const visibleTops = requestCountry
      ? activeTops.filter((top) => !isCountryBlocked(requestCountry, top.profileId.blockedCountries))
      : activeTops;

    // Update positions if needed
    activeTops.forEach((top, index) => {
      top.position = index + 1;
    });

    const response = {
      success: true,
      city,
      country,
      totalTops: visibleTops.length,
      tops: visibleTops.map(top => ({
        id: top._id,
        profile: {
          id: top.profileId._id,
          displayName: top.profileId.displayName,
          bio: top.profileId.bio,
          imagesMain: top.profileId.imagesMain,
          age: top.profileId.age,
          gender: top.profileId.gender
        },
        planType: top.planType,
        viewCount: top.viewCount,
        clickCount: top.clickCount,
        position: top.position,
        startDate: top.startDate,
        endDate: top.endDate
      }))
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching tops by city:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// POST /api/profiles/top-rojo/:id/renew
export const renewTopRojo = async (req, res) => {
  try {
    const { id } = req.params;
    const { planType, status = "active" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid top-rojo ID"
      });
    }

    if (!planType || !PLANS[planType]) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan type"
      });
    }

    const topRojo = await TopRojo.findById(id);
    if (!topRojo) {
      return res.status(404).json({
        success: false,
        message: "Top-rojo not found"
      });
    }

    // Create new payment intent
    let paymentId = null;
    if (status === "active") {
      try {
        const paymentIntent = await getStripe().paymentIntents.create({
          amount: PLANS[planType].price,
          currency: "usd",
          metadata: {
            topRojoId: id,
            renewalType: "renew"
          }
        });
        paymentId = paymentIntent.id;
      } catch (stripeError) {
        return res.status(500).json({
          success: false,
          message: "Payment processing failed",
          error: stripeError.message
        });
      }
    }

    // Update plan type and end date
    const now = new Date();
    topRojo.planType = planType;
    
    // Solo actualizamos la fecha final si se va a activar inmediatamente, o si se mantiene lógica anterior
    topRojo.endDate = new Date(now.getTime() + PLANS[planType].hours * 60 * 60 * 1000);
    
    if (paymentId) topRojo.paymentId = paymentId;
    topRojo.status = status;

    await topRojo.save();
    await topRojo.populate("profileId");

    res.status(200).json({
      success: true,
      topRojo: {
        id: topRojo._id,
        planType: topRojo.planType,
        endDate: topRojo.endDate,
        status: topRojo.status
      }
    });
  } catch (error) {
    console.error("Error renewing top-rojo:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// POST /api/profiles/top-rojo/:id/cancel
export const cancelTopRojo = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid top-rojo ID"
      });
    }

    const topRojo = await TopRojo.findById(id);
    if (!topRojo) {
      return res.status(404).json({
        success: false,
        message: "Top-rojo not found"
      });
    }

    topRojo.status = "cancelled";
    topRojo.active = false;
    await topRojo.save();

    res.status(200).json({
      success: true,
      message: "Top-rojo cancelled successfully"
    });
  } catch (error) {
    console.error("Error cancelling top-rojo:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

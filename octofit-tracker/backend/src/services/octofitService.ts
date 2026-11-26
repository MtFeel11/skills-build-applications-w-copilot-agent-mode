import { Activity, Team, User, Workout } from '../models/index.js';
import mongoose from 'mongoose';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw Object.assign(new Error('Invalid activity input'), { status: 400 });
  }

  const { userId, teamId, type, minutes } = input as {
    userId?: unknown;
    teamId?: unknown;
    type?: unknown;
    minutes?: unknown;
  };

  if (
    typeof userId !== 'string'
    || typeof teamId !== 'string'
    || typeof type !== 'string'
    || type.trim().length === 0
    || typeof minutes !== 'number'
    || !Number.isFinite(minutes)
    || minutes < 1
  ) {
    throw Object.assign(new Error('Invalid activity input'), { status: 400 });
  }

  if (!mongoose.isObjectIdOrHexString(userId) || !mongoose.isObjectIdOrHexString(teamId)) {
    throw Object.assign(new Error('Invalid user or team id'), { status: 400 });
  }

  const [user, team] = await Promise.all([
    User.findById(userId).lean(),
    Team.findById(teamId).lean(),
  ]);

  if (!user || !team) {
    throw Object.assign(new Error('User or team not found'), { status: 404 });
  }

  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw Object.assign(new Error('Invalid team input'), { status: 400 });
  }

  const { name, mascot, members = [] } = input as {
    name?: unknown;
    mascot?: unknown;
    members?: unknown;
  };

  if (
    typeof name !== 'string'
    || name.trim().length === 0
    || typeof mascot !== 'string'
    || mascot.trim().length === 0
    || !Array.isArray(members)
  ) {
    throw Object.assign(new Error('Invalid team input'), { status: 400 });
  }

  if (members.some((memberId) => typeof memberId !== 'string' || !mongoose.isObjectIdOrHexString(memberId))) {
    throw Object.assign(new Error('Invalid team member id'), { status: 400 });
  }

  const memberIds = [...new Set(members as string[])];
  const foundMembers = await User.find({ _id: { $in: memberIds } }).select('_id').lean();
  if (foundMembers.length !== memberIds.length) {
    throw Object.assign(new Error('One or more team members not found'), { status: 404 });
  }

  const team = await Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members: memberIds,
  });

  await User.updateMany(
    { _id: { $in: memberIds } },
    { $set: { team: team._id } },
  );

  return team;
}

export async function getLeaderboard() {
  const entries = await Activity.aggregate([
    {
      $group: {
        _id: '$team',
        totalPoints: { $sum: '$points' },
      },
    },
    { $sort: { totalPoints: -1 } },
  ]);

  if (entries.length === 0) {
    return [];
  }

  const teams = await Team.find({
    _id: { $in: entries.map((entry) => entry._id) },
  }).lean();
  const teamsById = new Map(teams.map((team) => [team._id.toString(), team]));

  return entries.flatMap((entry, index) => {
    const team = teamsById.get(entry._id.toString());
    return team
      ? [{
          teamName: team.name,
          totalPoints: entry.totalPoints,
          rank: index + 1,
        }]
      : [];
  });
}

export async function suggestWorkouts(userEmail: string) {
  if (typeof userEmail !== 'string' || userEmail.trim().length === 0) {
    throw Object.assign(new Error('Invalid user email'), { status: 400 });
  }

  const user = await User.findOne({ email: userEmail.trim() }).lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const activities = await Activity.find({ user: user._id })
    .sort({ occurredAt: -1 })
    .limit(10)
    .lean();

  const activityTypes = new Set(
    activities
      .map((activity) => activity.type.toLowerCase())
      .filter((type) => type.length > 0),
  );
  const focusTargets = new Set<string>();

  if (typeof user.fitnessGoal === 'string') {
    focusTargets.add(user.fitnessGoal.toLowerCase());
  }
  for (const type of activityTypes) {
    if (type === 'run' || type === 'cycle' || type === 'cycling') {
      focusTargets.add('endurance');
    } else if (type === 'strength' || type === 'weightlifting') {
      focusTargets.add('strength');
    } else {
      focusTargets.add(type);
    }
  }

  const workouts = await Workout.find().lean();
  const ranked = workouts
    .map((workout) => ({
      workout,
      score: focusTargets.has(workout.focus.toLowerCase()) ? 1 : 0,
    }))
    .sort((left, right) => right.score - left.score);

  return ranked.slice(0, 1).flatMap(({ workout }) => {
    const focus = workout.focus.toLowerCase();
    const matchedActivity = [...activityTypes].find((type) => {
      if (focus === 'endurance') return type === 'run' || type === 'cycle' || type === 'cycling';
      if (focus === 'strength') return type === 'strength' || type === 'weightlifting';
      return type === focus;
    });
    const reason = matchedActivity
      ? `Matches your ${matchedActivity} activity and ${workout.focus} focus`
      : `Matches your ${user.fitnessGoal} fitness goal`;

    return [{
      ...workout,
      reason,
    }];
  });
}

export { User };

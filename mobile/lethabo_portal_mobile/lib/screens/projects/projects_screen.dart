import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class ProjectsScreen extends StatefulWidget {
  const ProjectsScreen({super.key});

  @override
  State<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends State<ProjectsScreen> {
  // ============================================================
  // COLORS
  // ============================================================

  static const Color yellow = Color(0xFFFFEE0B);
  static const Color black = Color(0xFF0D0D0D);
  static const Color cardColor = Color(0xFF1A1A1A);

  // ============================================================
  // AZURE API
  // ============================================================

  // Public ASP.NET Core API hosted on Azure App Service.
  static const String apiBaseUrl =
      'https://lethabo-portal-api-g6dzc3gphwbsameu.southafricanorth-01.azurewebsites.net';

  // ============================================================
  // PROJECT DATA
  // ============================================================

  // Projects will now come from the Azure SQL database
  // through the ASP.NET Core API instead of being hard-coded.
  List<Map<String, dynamic>> projects = [];

  // Controls whether projects are currently being downloaded.
  bool isLoading = true;

  // Stores an error message if the API request fails.
  String? errorMessage;

  // Currently selected project status filter.
  String selectedFilter = 'All';

  // Stores what the user types into the search box.
  String searchText = '';

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  @override
  void initState() {
    super.initState();

    // Load projects as soon as the Projects screen opens.
    fetchProjects();
  }

  // ============================================================
  // GET PROJECTS FROM AZURE API
  // ============================================================

  Future<void> fetchProjects() async {
    setState(() {
      isLoading = true;
      errorMessage = null;
    });

    try {
      // Call:
      // GET https://...azurewebsites.net/api/projects
      final response = await http.get(Uri.parse('$apiBaseUrl/api/projects'));

      // HTTP 200 means the request was successful.
      if (response.statusCode == 200) {
        final List<dynamic> jsonData = jsonDecode(response.body);

        if (!mounted) return;

        setState(() {
          projects = jsonData
              .map((project) => Map<String, dynamic>.from(project))
              .toList();

          isLoading = false;
        });
      } else {
        if (!mounted) return;

        setState(() {
          errorMessage =
              'Unable to load projects. Status code: ${response.statusCode}';
          isLoading = false;
        });
      }
    } catch (error) {
      if (!mounted) return;

      setState(() {
        errorMessage = 'Unable to connect to the server.';
        isLoading = false;
      });
    }
  }

  // ============================================================
  // FILTER AND SEARCH PROJECTS
  // ============================================================

  List<Map<String, dynamic>> get filteredProjects {
    return projects.where((project) {
      final String status = (project['status'] ?? '').toString();

      final String name = (project['name'] ?? '').toString().toLowerCase();

      final String service = (project['service'] ?? '')
          .toString()
          .toLowerCase();

      final String clientName = (project['clientName'] ?? '')
          .toString()
          .toLowerCase();

      final String search = searchText.toLowerCase();

      // Check the selected status.
      final bool matchesFilter =
          selectedFilter == 'All' || status == selectedFilter;

      // Search by project name, service or client name.
      final bool matchesSearch =
          search.isEmpty ||
          name.contains(search) ||
          service.contains(search) ||
          clientName.contains(search);

      return matchesFilter && matchesSearch;
    }).toList();
  }

  // ============================================================
  // SCREEN
  // ============================================================

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: black,

      appBar: AppBar(
        backgroundColor: black,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Text(
          'My Projects',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            onPressed: () {},
            icon: const Icon(
              Icons.notifications_none_rounded,
              color: Colors.white,
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),

      body: SafeArea(
        child: Column(
          children: [
            // ==================================================
            // SEARCH
            // ==================================================
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 15, 20, 10),
              child: TextField(
                style: const TextStyle(color: Colors.white),

                // Update search results while the user types.
                onChanged: (value) {
                  setState(() {
                    searchText = value;
                  });
                },

                decoration: InputDecoration(
                  hintText: 'Search projects...',
                  hintStyle: const TextStyle(color: Colors.grey),
                  prefixIcon: const Icon(Icons.search, color: Colors.grey),
                  filled: true,
                  fillColor: cardColor,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(15),
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(15),
                    borderSide: const BorderSide(color: yellow),
                  ),
                ),
              ),
            ),

            // ==================================================
            // FILTERS
            // ==================================================
            SizedBox(
              height: 55,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 7,
                ),
                children: [
                  _filterButton('All'),
                  _filterButton('In Progress'),
                  _filterButton('Planning'),
                  _filterButton('Completed'),
                ],
              ),
            ),

            // ==================================================
            // PROJECT CONTENT
            // ==================================================
            Expanded(child: _buildProjectContent()),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // PROJECT CONTENT
  // ============================================================

  Widget _buildProjectContent() {
    // Show loading indicator while calling Azure.
    if (isLoading) {
      return const Center(child: CircularProgressIndicator(color: yellow));
    }

    // Show an error message if the API call fails.
    if (errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(30),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.cloud_off_rounded, color: Colors.grey, size: 50),

              const SizedBox(height: 15),

              Text(
                errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white),
              ),

              const SizedBox(height: 20),

              ElevatedButton(
                onPressed: fetchProjects,
                style: ElevatedButton.styleFrom(
                  backgroundColor: yellow,
                  foregroundColor: black,
                ),
                child: const Text('Try Again'),
              ),
            ],
          ),
        ),
      );
    }

    // Show message when there are no projects matching
    // the current search/filter.
    if (filteredProjects.isEmpty) {
      return const Center(
        child: Text(
          'No projects found.',
          style: TextStyle(color: Colors.grey, fontSize: 14),
        ),
      );
    }

    // Display projects returned from Azure.
    return RefreshIndicator(
      onRefresh: fetchProjects,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(20, 15, 20, 30),
        itemCount: filteredProjects.length,
        itemBuilder: (context, index) {
          final project = filteredProjects[index];

          return Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: _projectCard(project),
          );
        },
      ),
    );
  }

  // ============================================================
  // FILTER BUTTON
  // ============================================================

  Widget _filterButton(String filter) {
    final bool selected = selectedFilter == filter;

    return Padding(
      padding: const EdgeInsets.only(right: 10),
      child: GestureDetector(
        onTap: () {
          setState(() {
            selectedFilter = filter;
          });
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 9),
          decoration: BoxDecoration(
            color: selected ? yellow : cardColor,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            filter,
            style: TextStyle(
              color: selected ? black : Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }

  // ============================================================
  // PROJECT CARD
  // ============================================================

  Widget _projectCard(Map<String, dynamic> project) {
    // ASP.NET sends progress as 0 - 100.
    // Flutter's LinearProgressIndicator expects 0.0 - 1.0.
    final int progress = (project['progress'] as num?)?.toInt() ?? 0;

    final double progressValue = (progress / 100).clamp(0.0, 1.0);

    return InkWell(
      borderRadius: BorderRadius.circular(20),

      onTap: () {
        // Project Details navigation will be connected next.
      },

      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: cardColor,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ==================================================
            // PROJECT NAME AND SERVICE
            // ==================================================
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: yellow.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: const Icon(Icons.folder_outlined, color: yellow),
                ),

                const SizedBox(width: 14),

                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        project['name'] ?? 'Unnamed Project',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),

                      const SizedBox(height: 5),

                      Text(
                        project['service'] ?? '',
                        style: const TextStyle(
                          color: Colors.grey,
                          fontSize: 12,
                        ),
                      ),

                      const SizedBox(height: 5),

                      // Display the client returned by the API.
                      Text(
                        project['clientName'] ?? '',
                        style: const TextStyle(
                          color: Colors.grey,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),

                const Icon(Icons.chevron_right_rounded, color: Colors.grey),
              ],
            ),

            const SizedBox(height: 20),

            // ==================================================
            // STATUS
            // ==================================================
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
              decoration: BoxDecoration(
                color: yellow.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                project['status'] ?? '',
                style: const TextStyle(
                  color: yellow,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),

            const SizedBox(height: 20),

            // ==================================================
            // PROGRESS
            // ==================================================
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Progress',
                  style: TextStyle(color: Colors.grey, fontSize: 12),
                ),
                Text(
                  '$progress%',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 9),

            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: LinearProgressIndicator(
                value: progressValue,
                minHeight: 7,
                backgroundColor: const Color(0xFF333333),
                valueColor: const AlwaysStoppedAnimation<Color>(yellow),
              ),
            ),

            const SizedBox(height: 18),

            // ==================================================
            // DUE DATE
            // ==================================================
            Row(
              children: [
                const Icon(
                  Icons.calendar_today_outlined,
                  color: Colors.grey,
                  size: 15,
                ),

                const SizedBox(width: 7),

                Text(
                  'Due ${project['dueLabel'] ?? ''}',
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
